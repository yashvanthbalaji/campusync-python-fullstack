from sqlalchemy import BigInteger, Column, DateTime, String
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime

class Base(DeclarativeBase):
    pass

class Complaint(Base):
    __tablename__ = 'complaints'

    id = Column(BigInteger, primary_key=True)
    student_email = Column(String(255), nullable=False)
    student_name = Column(String(255), nullable=True)
    room_number = Column(String(255), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=False)
    category = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default='PENDING')
    image_path = Column(String(255), nullable=True)
    time_of_day = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by_worker = Column(String(255), nullable=True)
    worker_note = Column(String(500), nullable=True)
    work_type = Column(String(255), nullable=True)
    assigned_worker_email = Column(String(255), nullable=True)
    assigned_worker_name = Column(String(255), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'studentEmail': self.student_email,
            'studentName': self.student_name or '',
            'roomNumber': self.room_number or '',
            'title': self.title,
            'description': self.description,
            'category': self.category or 'OTHER',
            'status': self.status,
            'imagePath': self.image_path or '',
            'timeOfDay': self.time_of_day or '',
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'resolvedAt': self.resolved_at.isoformat() if self.resolved_at else None,
            'resolvedByWorker': self.resolved_by_worker or '',
            'workerNote': self.worker_note or '',
            'workType': self.work_type or '',
            'assignedWorkerEmail': self.assigned_worker_email or '',
            'assignedWorkerName': self.assigned_worker_name or ''
        }
