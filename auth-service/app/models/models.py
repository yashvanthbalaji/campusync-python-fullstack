from sqlalchemy import BigInteger, Column, DateTime, Integer, String
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = 'users'

    id = Column(BigInteger, primary_key=True)
    name = Column(String(100), nullable=True)
    email = Column(String(150), unique=True, nullable=False)
    password = Column(String(255), nullable=True)
    role = Column(String(20), nullable=False, default='STUDENT')
    phone_number = Column(String(20), nullable=True)
    work_types = Column(String(500), nullable=True)
    max_complaints = Column(Integer, nullable=True)
    room_number = Column(String(10), nullable=True)
    year = Column(String(10), nullable=True)
    student_type = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    firebase_uid = Column(String(128), unique=True, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name or '',
            'email': self.email,
            'role': self.role,
            'phoneNumber': self.phone_number or '',
            'workTypes': self.work_types or '',
            'maxComplaints': self.max_complaints,
            'roomNumber': self.room_number or '',
            'year': self.year or '',
            'studentType': self.student_type or '',
            'firebaseUid': self.firebase_uid or ''
        }
