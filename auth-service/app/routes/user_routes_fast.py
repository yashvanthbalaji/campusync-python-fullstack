from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.firebase_auth_fast import verify_firebase_token, FirebaseUser
import app.services.user_service_fast as svc
from app.schemas.pydantic_schemas import (
    WorkerProfileRequest, UpdateProfileRequest,
    AssignRoleRequest, user_to_response
)

router = APIRouter(prefix='/api/users', tags=['users'])

@router.get('/health')
def health():
    return 'User service is UP!'

@router.post('/sync-profile')
def sync_profile(
    current_user: FirebaseUser = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    try:
        user = svc.sync_profile(db, current_user.uid, current_user.email)
        return user_to_response(user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/me')
def get_me(
    current_user: FirebaseUser = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    user = svc.get_user_by_email(db, current_user.email)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return user_to_response(user)

@router.get('/user/{email}')
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    user = svc.get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return {
        'email': user.email,
        'name': user.name or '',
        'role': user.role,
        'phoneNumber': user.phone_number or '',
        'studentType': user.student_type or 'HOSTEL'
    }

@router.get('/users')
def get_all_users(
    current_user: FirebaseUser = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    caller = svc.get_user_by_email(db, current_user.email)
    if not caller or caller.role != 'ADMIN':
        raise HTTPException(status_code=403, detail='Forbidden')
    return [user_to_response(u) for u in svc.get_all_users(db)]

@router.put('/worker-profile')
def update_worker_profile(
    body: WorkerProfileRequest,
    current_user: FirebaseUser = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    try:
        user = svc.update_worker_profile(db, current_user.email, body.model_dump(exclude_none=True))
        return user_to_response(user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put('/update-profile')
def update_profile(
    body: UpdateProfileRequest,
    current_user: FirebaseUser = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    try:
        user = svc.update_profile(db, current_user.email, body.model_dump(exclude_none=True))
        return user_to_response(user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/workers-by-type')
def get_workers_by_type(type: str, db: Session = Depends(get_db)):
    return [user_to_response(w) for w in svc.get_workers_by_type(db, type)]

@router.put('/assign-role')
def assign_role(
    body: AssignRoleRequest,
    current_user: FirebaseUser = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    caller = svc.get_user_by_email(db, current_user.email)
    if not caller or caller.role != 'ADMIN':
        raise HTTPException(status_code=403, detail='Forbidden')
    try:
        user = svc.assign_role(db, body.email, body.role)
        return {'message': 'Role updated successfully', 'email': user.email, 'role': user.role}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
