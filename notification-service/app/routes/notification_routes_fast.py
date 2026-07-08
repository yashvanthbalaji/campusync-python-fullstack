from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Notification
from app.schemas.pydantic_schemas import notification_to_response
from typing import Optional
import logging

log = logging.getLogger(__name__)

router = APIRouter(prefix='/api/notifications', tags=['notifications'])

@router.get('/health')
def health():
    return "Notification service is UP on port 8084!"

@router.get('/my')
def get_my_notifications(
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db)
):
    if not x_user_email:
        raise HTTPException(status_code=400, detail='X-User-Email header required')
    notifications = (
        db.query(Notification)
        .filter(Notification.recipient_email == x_user_email)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return [notification_to_response(n) for n in notifications]

@router.get('/unread-count')
def get_unread_count(
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db)
):
    if not x_user_email:
        raise HTTPException(status_code=400, detail='X-User-Email header required')
    count = (
        db.query(func.count(Notification.id))
        .filter(
            Notification.recipient_email == x_user_email,
            Notification.is_read == False
        )
        .scalar()
    )
    return {'count': count}

@router.put('/mark-read/{id}')
def mark_as_read(id: int, db: Session = Depends(get_db)):
    notification = db.query(Notification).filter(Notification.id == id).first()
    if notification:
        notification.is_read = True
        db.commit()
    return {}

@router.put('/mark-all-read')
def mark_all_read(
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db)
):
    if not x_user_email:
        raise HTTPException(status_code=400, detail='X-User-Email header required')
    db.query(Notification).filter(
        Notification.recipient_email == x_user_email,
        Notification.is_read == False
    ).update({'is_read': True})
    db.commit()
    return {}
