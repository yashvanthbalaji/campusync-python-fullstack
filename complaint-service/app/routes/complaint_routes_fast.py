from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header
from fastapi.responses import FileResponse
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.firebase_auth_fast import verify_firebase_token, FirebaseUser
import app.services.complaint_service as svc
from app.schemas.pydantic_schemas import ResolveRequest, AssignUnassignedRequest
import os
import logging
import requests as http_requests

log = logging.getLogger(__name__)

AUTH_SERVICE_URL = os.environ.get('AUTH_SERVICE_URL', 'http://localhost:8081')

router = APIRouter(prefix='/api/complaints', tags=['complaints'])

class FileWrapper:
    def __init__(self, upload_file: UploadFile):
        self.upload_file = upload_file
        self.filename = upload_file.filename

    def save(self, destination):
        with open(destination, "wb") as f:
            f.write(self.upload_file.file.read())

@router.get('/health')
def health():
    return "Complaint service is UP on port 8082!"

@router.post('/raise', status_code=201)
def raise_complaint(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form('OTHER'),
    roomNumber: str = Form(''),
    timeOfDay: str = Form(''),
    image: Optional[UploadFile] = File(None),
    current_user: FirebaseUser = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    try:
        email = current_user.email
        form_data = {
            'title': title,
            'description': description,
            'category': category,
            'roomNumber': roomNumber,
            'timeOfDay': timeOfDay,
        }
        
        wrapped_image = FileWrapper(image) if image and image.filename else None

        complaint = svc.raise_complaint(
            student_email=email,
            form_data=form_data,
            image_file=wrapped_image,
            auth_service_url=AUTH_SERVICE_URL,
        )
        return complaint.to_dict()
    except Exception as e:
        log.error("[Routes] POST /raise failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/my')
def get_my_complaints(
    current_user: FirebaseUser = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    try:
        complaints = svc.get_my_complaints(current_user.email)
        return [c.to_dict() for c in complaints]
    except Exception as e:
        log.error("[Routes] GET /my failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/all')
def get_all_complaints(
    current_user: FirebaseUser = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    try:
        email = current_user.email
        # Role check
        try:
            resp = http_requests.get(
                f"{AUTH_SERVICE_URL}/api/users/user/{email}", timeout=5
            )
            if resp.status_code == 200:
                role = resp.json().get('role', '')
                if role not in ('WORKER', 'ADMIN'):
                    raise HTTPException(status_code=403, detail='Access denied')
        except HTTPException as he:
            raise he
        except Exception as e:
            log.warning("⚠️ Role check failed (allowing through): %s", e)

        complaints = svc.get_all_complaints()
        return [c.to_dict() for c in complaints]
    except HTTPException as he:
        raise he
    except Exception as e:
        log.error("[Routes] GET /all failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/pending')
def get_pending_complaints(db: Session = Depends(get_db)):
    try:
        complaints = svc.get_pending_complaints()
        return [c.to_dict() for c in complaints]
    except Exception as e:
        log.error("[Routes] GET /pending failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/my-assigned')
def get_my_assigned_complaints(
    current_user: FirebaseUser = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    try:
        complaints = svc.get_my_assigned_complaints(current_user.email)
        return [c.to_dict() for c in complaints]
    except Exception as e:
        log.error("[Routes] GET /my-assigned failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

@router.put('/{id}/resolve')
def resolve_complaint(
    id: int,
    body: ResolveRequest,
    current_user: FirebaseUser = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    try:
        email = current_user.email
        # Role check
        try:
            resp = http_requests.get(
                f"{AUTH_SERVICE_URL}/api/users/user/{email}", timeout=5
            )
            if resp.status_code == 200:
                role = resp.json().get('role', '')
                if role not in ('WORKER', 'ADMIN'):
                    raise HTTPException(status_code=403, detail='Access denied')
        except HTTPException as he:
            raise he
        except Exception as e:
            log.warning("⚠️ Role check failed (allowing through): %s", e)

        complaint = svc.resolve_complaint(id, body.workerNote, email)
        return complaint.to_dict()
    except HTTPException as he:
        raise he
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        log.error("[Routes] PUT /%s/resolve failed: %s", id, e)
        raise HTTPException(status_code=400, detail=str(e))

@router.put('/update-status/{id}')
def update_status(id: int, status: str, db: Session = Depends(get_db)):
    try:
        complaint = svc.update_status(id, status)
        return complaint.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        log.error("[Routes] PUT /update-status/%s failed: %s", id, e)
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/images/{filename}')
def get_image(filename: str):
    upload_dir = os.path.abspath('uploads/complaints')
    filepath = os.path.join(upload_dir, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail='Image not found')
    return FileResponse(filepath)

@router.put('/assign-unassigned')
def assign_unassigned(body: AssignUnassignedRequest, db: Session = Depends(get_db)):
    try:
        count = svc.assign_unassigned_complaints(body.workType, body.workerEmail)
        return {
            'assigned': count,
            'workType': body.workType,
            'workerEmail': body.workerEmail,
        }
    except Exception as e:
        log.error("[Routes] PUT /assign-unassigned failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))
