from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.firebase_auth_fast import verify_firebase_token, FirebaseUser
import app.services.lost_found_service as svc
import app.services.gemini_service as gemini_svc
from pydantic import BaseModel
from typing import Optional
import os
import logging
import requests as http_requests

log = logging.getLogger(__name__)

AUTH_SERVICE_URL = os.environ.get('AUTH_SERVICE_URL', 'http://localhost:8081')

router = APIRouter(prefix='/api/lost-found', tags=['lost-found'])

class UpdateItemStatusRequest(BaseModel):
    itemStatus: str

@router.get('/health')
def health():
    return "Lost & Found service is UP on port 8083!"

@router.post('/')
@router.post('')
def report_item(
    itemName: str = Form(...),
    description: Optional[str] = Form(''),
    type: str = Form(...),
    priority: str = Form(...),
    locationCategory: str = Form(...),
    locationFloor: str = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: FirebaseUser = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    try:
        email = current_user.email

        # Role check — only STUDENT can use Lost & Found
        try:
            url = f"{AUTH_SERVICE_URL}/api/users/user/{email}"
            resp = http_requests.get(url, timeout=5)
            if resp.status_code == 200:
                user_info = resp.json()
                if user_info.get('role') != 'STUDENT':
                    raise HTTPException(status_code=403, detail='Only students can use Lost & Found')
        except HTTPException as he:
            raise he
        except Exception as e:
            log.warning("⚠️ Role check failed (allowing request): %s", e)

        data = {
            'itemName': itemName,
            'description': description or '',
            'type': type,
            'priority': priority,
            'locationCategory': locationCategory,
            'locationFloor': locationFloor
        }

        image_path = None
        if image and image.filename:
            import uuid
            original_filename = image.filename
            ext = os.path.splitext(original_filename)[1]
            unique_filename = f"{uuid.uuid4()}{ext}"
            upload_dir = os.path.join('uploads', 'lostfound')
            os.makedirs(upload_dir, exist_ok=True)
            with open(os.path.join(upload_dir, unique_filename), "wb") as f:
                f.write(image.file.read())
            image_path = unique_filename

        item = svc.report_item(email, data, image_path, db)
        return item.to_dict()

    except HTTPException as he:
        raise he
    except Exception as e:
        log.error("[Routes] POST / failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/all')
def get_all_items(
    campus: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    try:
        viewer_student_type = 'HOSTEL'
        if authorization and authorization.startswith('Bearer '):
            token = authorization[7:]
            try:
                from firebase_admin import auth as fb_auth
                decoded = fb_auth.verify_id_token(token, clock_skew_seconds=60)
                email = decoded.get('email')
                if email:
                    url = f"{AUTH_SERVICE_URL}/api/users/user/{email}"
                    resp = http_requests.get(url, timeout=5)
                    if resp.status_code == 200:
                        viewer_student_type = resp.json().get('studentType') or 'HOSTEL'
            except Exception as e:
                log.warning("⚠️ Token verification or user fetch failed (defaulting HOSTEL): %s", e)

        items = svc.get_all_items(viewer_student_type, campus_filter=campus, db=db)
        return [i.to_dict() for i in items]
    except Exception as e:
        log.error("[Routes] GET /all failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/my')
def get_my_items(
    current_user: FirebaseUser = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    try:
        items = svc.get_my_items(current_user.email, db)
        return [i.to_dict() for i in items]
    except Exception as e:
        log.error("[Routes] GET /my failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/type')
def get_by_type(
    type: str,
    campus: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    try:
        viewer_student_type = 'HOSTEL'
        if authorization and authorization.startswith('Bearer '):
            token = authorization[7:]
            try:
                from firebase_admin import auth as fb_auth
                decoded = fb_auth.verify_id_token(token, clock_skew_seconds=60)
                email = decoded.get('email')
                if email:
                    url = f"{AUTH_SERVICE_URL}/api/users/user/{email}"
                    resp = http_requests.get(url, timeout=5)
                    if resp.status_code == 200:
                        viewer_student_type = resp.json().get('studentType') or 'HOSTEL'
            except Exception as e:
                log.warning("⚠️ Token verification or user fetch failed (defaulting HOSTEL): %s", e)

        items = svc.get_by_type(type, viewer_student_type, campus_filter=campus, db=db)
        return [i.to_dict() for i in items]
    except Exception as e:
        log.error("[Routes] GET /type failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/matches')
def get_potential_matches(db: Session = Depends(get_db)):
    try:
        matches = svc.get_potential_matches(db)
        return [i.to_dict() for i in matches]
    except Exception as e:
        log.error("[Routes] GET /matches failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/{id}/match-details')
def get_match_details(id: int, db: Session = Depends(get_db)):
    try:
        details = svc.get_matched_pair_details(id, db)
        return details
    except Exception as e:
        log.error("[Routes] GET /%s/match-details failed: %s", id, e)
        raise HTTPException(status_code=400, detail=str(e))

@router.put('/status/{id}')
def update_item_status(
    id: int,
    body: UpdateItemStatusRequest,
    db: Session = Depends(get_db)
):
    try:
        item = svc.update_item_status(id, body.itemStatus, db)
        return item.to_dict()
    except Exception as e:
        log.error("[Routes] PUT /status/%s failed: %s", id, e)
        raise HTTPException(status_code=400, detail=str(e))

@router.put('/{id}/resolve')
def confirm_resolved(id: int, db: Session = Depends(get_db)):
    try:
        item = svc.confirm_resolved(id, db)
        return item.to_dict()
    except Exception as e:
        log.error("[Routes] PUT /%s/resolve failed: %s", id, e)
        raise HTTPException(status_code=400, detail=str(e))

@router.put('/{id}/status')
def update_status(id: int, status: str, db: Session = Depends(get_db)):
    try:
        item = svc.update_status(id, status, db)
        return item.to_dict()
    except Exception as e:
        log.error("[Routes] PUT /%s/status failed: %s", id, e)
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/by-item-status')
def get_by_item_status(status: str, db: Session = Depends(get_db)):
    try:
        items = svc.get_items_by_item_status(status, db)
        return [i.to_dict() for i in items]
    except Exception as e:
        log.error("[Routes] GET /by-item-status failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/search')
def search(query: str, db: Session = Depends(get_db)):
    try:
        items = gemini_svc.search_by_description(query, db)
        return [i.to_dict() for i in items]
    except Exception as e:
        log.error("[Routes] GET /search failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/images/{filename}')
def get_image(filename: str):
    upload_dir = os.path.abspath('uploads/lostfound')
    filepath = os.path.join(upload_dir, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail='Image not found')
    return FileResponse(filepath)
