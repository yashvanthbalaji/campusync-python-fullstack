from pydantic import BaseModel, EmailStr
from typing import Optional

class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    role: str
    phoneNumber: Optional[str] = None
    workTypes: Optional[str] = None
    maxComplaints: Optional[int] = None
    roomNumber: Optional[str] = None
    year: Optional[str] = None
    studentType: Optional[str] = None

    class Config:
        from_attributes = True

class WorkerProfileRequest(BaseModel):
    name: Optional[str] = None
    phoneNumber: Optional[str] = None
    workTypes: Optional[str] = None
    maxComplaints: Optional[int] = None

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phoneNumber: Optional[str] = None
    roomNumber: Optional[str] = None
    year: Optional[str] = None
    studentType: Optional[str] = None

class AssignRoleRequest(BaseModel):
    email: str
    role: str

def user_to_response(user) -> dict:
    return {
        'id': user.id,
        'email': user.email,
        'name': user.name or '',
        'role': user.role,
        'phoneNumber': user.phone_number or '',
        'workTypes': user.work_types or '',
        'maxComplaints': user.max_complaints,
        'roomNumber': user.room_number or '',
        'year': user.year or '',
        'studentType': user.student_type or ''
    }
