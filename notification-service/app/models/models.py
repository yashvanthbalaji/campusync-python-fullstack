from datetime import datetime
from app.extensions import db


class Notification(db.Model):
    """
    Notification — SQLAlchemy model for the 'notifications' table.
    Mirrors the Java JPA entity in notification-service/src/.
    """
    __tablename__ = 'notifications'

    id               = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    recipient_email  = db.Column(db.String(255), nullable=False)
    title            = db.Column(db.String(255), nullable=False)
    message          = db.Column(db.String(500), nullable=False)
    type             = db.Column(db.String(30),  nullable=False)
    related_item_id  = db.Column(db.BigInteger,  nullable=True)
    is_read          = db.Column(db.Boolean, nullable=False, default=False)
    created_at       = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

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
