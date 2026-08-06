from sqlalchemy import BigInteger, Column, DateTime, String, Text
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime

class Base(DeclarativeBase):
    pass

class LostFoundItem(Base):
    __tablename__ = 'lost_found_items'

    id = Column(BigInteger, primary_key=True)
    reporter_email = Column(String(255), nullable=False)
    reporter_name = Column(String(255), nullable=True)
    reporter_phone = Column(String(255), nullable=True)
    item_name = Column(String(255), nullable=False)
    description = Column(String(255), nullable=False)
    type = Column(String(255), nullable=False)
    priority = Column(String(255), nullable=False)
    location_category = Column(String(255), nullable=False)
    location_floor = Column(String(255), nullable=False)
    match_status = Column(String(255), nullable=False, default='UNMATCHED')
    matched_with_id = Column(BigInteger, nullable=True)
    image_url = Column(String(255), nullable=True)
    ai_description = Column(String(255), nullable=True)
    ai_tags = Column(Text, nullable=True)
    status = Column(String(255), nullable=True, default='OPEN')
    location = Column(String(255), nullable=True)
    item_status = Column(String(255), nullable=False, default='OPEN')
    student_type = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)

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
