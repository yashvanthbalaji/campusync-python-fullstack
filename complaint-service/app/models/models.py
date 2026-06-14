from app.extensions import db
from datetime import datetime

class Complaint(db.Model):
    __tablename__ = 'complaints'

    id = db.Column(db.BigInteger, primary_key=True)
    student_email = db.Column(db.String(255), nullable=False)
    student_name = db.Column(db.String(255), nullable=True)
    room_number = db.Column(db.String(255), nullable=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(1000), nullable=False)
    category = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), nullable=False, default='PENDING')
    image_path = db.Column(db.String(255), nullable=True)
    time_of_day = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolved_by_worker = db.Column(db.String(255), nullable=True)
    worker_note = db.Column(db.String(500), nullable=True)
    work_type = db.Column(db.String(255), nullable=True)
    assigned_worker_email = db.Column(db.String(255), nullable=True)
    assigned_worker_name = db.Column(db.String(255), nullable=True)

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
