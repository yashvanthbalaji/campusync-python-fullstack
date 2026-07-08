import logging
import requests
import os
from sqlalchemy.orm import Session
from app.models.models import User

logger = logging.getLogger(__name__)

COMPLAINT_SERVICE_URL = os.environ.get('COMPLAINT_SERVICE_URL', 'http://localhost:8082')

def sync_profile(db: Session, firebase_uid: str, email: str) -> User:
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if user:
        return user
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.firebase_uid = firebase_uid
        db.commit()
        db.refresh(user)
        return user
    name = email.split('@')[0] if email else 'User'
    user = User(firebase_uid=firebase_uid, email=email, name=name, role='STUDENT')
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_all_users(db: Session):
    return db.query(User).all()

def update_worker_profile(db: Session, email: str, data: dict) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise ValueError('User not found')
    if 'name' in data: user.name = data['name']
    if 'phoneNumber' in data: user.phone_number = data['phoneNumber']
    if 'workTypes' in data: user.work_types = data['workTypes']
    if 'maxComplaints' in data: user.max_complaints = data['maxComplaints']
    db.commit()
    db.refresh(user)
    if user.work_types:
        for t in [x.strip() for x in user.work_types.split(',') if x.strip()]:
            try:
                requests.put(
                    f'{COMPLAINT_SERVICE_URL}/api/complaints/assign-unassigned',
                    json={'workType': t, 'workerEmail': email},
                    timeout=5
                )
            except Exception as e:
                logger.warning(f'Retroactive assign failed for {t}: {e}')
    return user

def update_profile(db: Session, email: str, data: dict) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise ValueError('User not found')
    if 'name' in data: user.name = data['name']
    if 'phoneNumber' in data: user.phone_number = data['phoneNumber']
    if 'roomNumber' in data: user.room_number = data['roomNumber']
    if 'year' in data: user.year = data['year']
    if 'studentType' in data: user.student_type = data['studentType']
    db.commit()
    db.refresh(user)
    return user

def get_workers_by_type(db: Session, work_type: str):
    return db.query(User).filter(
        User.role == 'WORKER',
        User.work_types.ilike(f'%{work_type}%')
    ).all()

def assign_role(db: Session, email: str, new_role: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise ValueError('User not found')
    user.role = new_role.upper()
    db.commit()
    db.refresh(user)
    return user
