from app.extensions import db
from datetime import datetime

class LostFoundItem(db.Model):
    __tablename__ = 'lost_found_items'

    id = db.Column(db.BigInteger, primary_key=True)
    reporter_email = db.Column(db.String(255), nullable=False)
    reporter_name = db.Column(db.String(255), nullable=True)
    reporter_phone = db.Column(db.String(255), nullable=True)
    item_name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(255), nullable=False)
    priority = db.Column(db.String(255), nullable=False)
    location_category = db.Column(db.String(255), nullable=False)
    location_floor = db.Column(db.String(255), nullable=False)
    match_status = db.Column(db.String(255), nullable=False, default='UNMATCHED')
    matched_with_id = db.Column(db.BigInteger, nullable=True)
    image_url = db.Column(db.String(255), nullable=True)
    ai_description = db.Column(db.String(255), nullable=True)
    ai_tags = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(255), nullable=True, default='OPEN')
    location = db.Column(db.String(255), nullable=True)
    item_status = db.Column(db.String(255), nullable=False, default='OPEN')
    student_type = db.Column(db.String(10), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'reporterEmail': self.reporter_email,
            'reporterName': self.reporter_name or '',
            'reporterPhone': self.reporter_phone or '',
            'itemName': self.item_name,
            'description': self.description,
            'type': self.type,
            'priority': self.priority,
            'locationCategory': self.location_category,
            'locationFloor': self.location_floor,
            'matchStatus': self.match_status,
            'matchedWithId': self.matched_with_id,
            'imageUrl': self.image_url or '',
            'aiDescription': self.ai_description or '',
            'status': self.status,
            'itemStatus': self.item_status,
            'studentType': self.student_type or '',
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
