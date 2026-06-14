import logging
import requests
from flask import current_app
from app.extensions import db
from app.models.models import User

logger = logging.getLogger(__name__)

class UserService:
    @staticmethod
    def sync_profile(firebase_uid, email):
        # 1. Check if user with this firebase_uid already exists
        user = User.query.filter_by(firebase_uid=firebase_uid).first()
        if user:
            return user

        # 2. Check if user with this email already exists
        user = User.query.filter_by(email=email).first()
        if user:
            user.firebase_uid = firebase_uid
            db.session.commit()
            return user

        # 3. Otherwise create a new user
        name = email.split('@')[0] if email else 'User'
        user = User(firebase_uid=firebase_uid, email=email, name=name, role='STUDENT')
        db.session.add(user)
        db.session.commit()
        return user

    @staticmethod
    def get_user_by_email(email):
        return User.query.filter_by(email=email).first()

    @staticmethod
    def get_all_users():
        return User.query.all()

    @staticmethod
    def update_worker_profile(email, data_dict):
        user = User.query.filter_by(email=email).first()
        if not user:
            raise ValueError("User not found")

        if 'name' in data_dict:
            user.name = data_dict['name']

        # Support both snake_case (post-deserialization) and camelCase (raw input)
        if 'phone_number' in data_dict:
            user.phone_number = data_dict['phone_number']
        elif 'phoneNumber' in data_dict:
            user.phone_number = data_dict['phoneNumber']

        if 'work_types' in data_dict:
            user.work_types = data_dict['work_types']
        elif 'workTypes' in data_dict:
            user.work_types = data_dict['workTypes']

        if 'max_complaints' in data_dict:
            user.max_complaints = data_dict['max_complaints']
        elif 'maxComplaints' in data_dict:
            user.max_complaints = data_dict['maxComplaints']

        db.session.commit()

        # Trigger retroactive assignments for the worker's work types
        if user.work_types:
            complaint_url = current_app.config.get('COMPLAINT_SERVICE_URL', 'http://localhost:8082')
            types = [t.strip() for t in user.work_types.split(',') if t.strip()]
            for t in types:
                try:
                    payload = {'workType': t, 'workerEmail': email}
                    response = requests.put(
                        f"{complaint_url}/api/complaints/assign-unassigned",
                        json=payload,
                        timeout=5
                    )
                    response.raise_for_status()
                except Exception as e:
                    logger.error(f"Failed to assign unassigned complaints for type {t} to worker {email}: {e}")

        return user

    @staticmethod
    def update_profile(email, data_dict):
        user = User.query.filter_by(email=email).first()
        if not user:
            raise ValueError("User not found")

        if 'name' in data_dict:
            user.name = data_dict['name']

        # Support both snake_case and camelCase keys
        if 'phone_number' in data_dict:
            user.phone_number = data_dict['phone_number']
        elif 'phoneNumber' in data_dict:
            user.phone_number = data_dict['phoneNumber']

        if 'room_number' in data_dict:
            user.room_number = data_dict['room_number']
        elif 'roomNumber' in data_dict:
            user.room_number = data_dict['roomNumber']

        if 'year' in data_dict:
            user.year = data_dict['year']

        if 'student_type' in data_dict:
            user.student_type = data_dict['student_type']
        elif 'studentType' in data_dict:
            user.student_type = data_dict['studentType']

        db.session.commit()
        return user

    @staticmethod
    def get_workers_by_type(work_type):
        return User.query.filter(
            User.role == 'WORKER',
            User.work_types.ilike(f'%{work_type}%')
        ).all()

    @staticmethod
    def assign_role(email, new_role):
        user = User.query.filter_by(email=email).first()
        if not user:
            raise ValueError("User not found")
        user.role = new_role.upper()
        db.session.commit()
        return user
