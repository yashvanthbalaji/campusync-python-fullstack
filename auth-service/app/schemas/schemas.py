from app.extensions import ma
from marshmallow import fields

class UserResponseSchema(ma.Schema):
    id = fields.Integer()
    email = fields.Email(required=True)
    name = fields.String(allow_none=True)
    role = fields.String(required=True)
    phone_number = fields.String(allow_none=True, data_key="phoneNumber")
    work_types = fields.String(allow_none=True, data_key="workTypes")
    max_complaints = fields.Integer(allow_none=True, data_key="maxComplaints")
    room_number = fields.String(allow_none=True, data_key="roomNumber")
    year = fields.String(allow_none=True)
    student_type = fields.String(allow_none=True, data_key="studentType")

class WorkerProfileSchema(ma.Schema):
    name = fields.String(required=False, allow_none=True)
    phone_number = fields.String(required=False, allow_none=True, data_key="phoneNumber")
    work_types = fields.String(required=False, allow_none=True, data_key="workTypes")
    max_complaints = fields.Integer(required=False, allow_none=True, data_key="maxComplaints")

class UpdateProfileSchema(ma.Schema):
    name = fields.String(required=False, allow_none=True)
    phone_number = fields.String(required=False, allow_none=True, data_key="phoneNumber")
    room_number = fields.String(required=False, allow_none=True, data_key="roomNumber")
    year = fields.String(required=False, allow_none=True)
    student_type = fields.String(required=False, allow_none=True, data_key="studentType")

class AssignRoleSchema(ma.Schema):
    email = fields.Email(required=True)
    role = fields.String(required=True)
