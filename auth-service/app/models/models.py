from app.extensions import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(20), nullable=False, default='STUDENT')
    phone_number = db.Column(db.String(20), nullable=True)
    work_types = db.Column(db.String(500), nullable=True)
    max_complaints = db.Column(db.Integer, nullable=True)
    room_number = db.Column(db.String(10), nullable=True)
    year = db.Column(db.String(10), nullable=True)
    student_type = db.Column(db.String(10), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    firebase_uid = db.Column(db.String(128), unique=True, nullable=True)

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
