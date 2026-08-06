from sqlalchemy import BigInteger, Boolean, Column, DateTime, String
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime

class Base(DeclarativeBase):
    pass

class Notification(Base):
    """
    Notification — SQLAlchemy model for the 'notifications' table.
    Mirrors the Java JPA entity in notification-service/src/.
    """
    __tablename__ = 'notifications'

    id               = Column(BigInteger, primary_key=True, autoincrement=True)
    recipient_email  = Column(String(255), nullable=False)
    title            = Column(String(255), nullable=False)
    message          = Column(String(500), nullable=False)
    type             = Column(String(30),  nullable=False)
    related_item_id  = Column(BigInteger,  nullable=True)
    is_read          = Column(Boolean, nullable=False, default=False)
    created_at       = Column(DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':            self.id,
            'recipientEmail': self.recipient_email,
            'title':         self.title,
            'message':       self.message,
            'type':          self.type,
            'relatedItemId': self.related_item_id,
            'read':          self.is_read,      # Java uses 'read', not 'isRead'
            'createdAt':     self.created_at.isoformat() if self.created_at else None,
        }
