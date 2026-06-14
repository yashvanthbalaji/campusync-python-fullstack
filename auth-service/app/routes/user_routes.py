from flask import Blueprint, request, jsonify
from app.services.user_service import UserService
from app.firebase_auth import firebase_required
from app.schemas.schemas import UserResponseSchema, WorkerProfileSchema, UpdateProfileSchema, AssignRoleSchema
from app.extensions import db

user_bp = Blueprint('user', __name__, url_prefix='/api/users')

user_response_schema = UserResponseSchema()
users_response_schema = UserResponseSchema(many=True)
worker_profile_schema = WorkerProfileSchema()
update_profile_schema = UpdateProfileSchema()
assign_role_schema = AssignRoleSchema()

@user_bp.route('/health', methods=['GET'])
def health():
    return "User service is UP!", 200

@user_bp.route('/sync-profile', methods=['POST'])
@firebase_required
def sync_profile(firebase_uid, email):
    try:
        user = UserService.sync_profile(firebase_uid, email)
        return jsonify(user_response_schema.dump(user)), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@user_bp.route('/me', methods=['GET'])
@firebase_required
def get_me(firebase_uid, email):
    user = UserService.get_user_by_email(email)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user_response_schema.dump(user)), 200

@user_bp.route('/user/<email>', methods=['GET'])
def get_user_by_email(email):
    user = UserService.get_user_by_email(email)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'email': user.email,
        'name': user.name or "",
        'role': user.role,
        'phoneNumber': user.phone_number or "",
        'studentType': user.student_type or 'HOSTEL'
    }), 200

@user_bp.route('/users', methods=['GET'])
@firebase_required
def get_all_users(firebase_uid, email):
    caller = UserService.get_user_by_email(email)
    if not caller or caller.role != 'ADMIN':
        return jsonify({'error': 'Forbidden'}), 403
    users = UserService.get_all_users()
    return jsonify(users_response_schema.dump(users)), 200

@user_bp.route('/worker-profile', methods=['PUT'])
@firebase_required
def update_worker_profile(firebase_uid, email):
    json_data = request.get_json()
    if not json_data:
        return jsonify({'error': 'No input data provided'}), 400

    errors = worker_profile_schema.validate(json_data)
    if errors:
        return jsonify({'error': errors}), 400

    try:
        user = UserService.update_worker_profile(email, json_data)
        return jsonify(user_response_schema.dump(user)), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@user_bp.route('/update-profile', methods=['PUT'])
@firebase_required
def update_profile(firebase_uid, email):
    json_data = request.get_json()
    if not json_data:
        return jsonify({'error': 'No input data provided'}), 400

    errors = update_profile_schema.validate(json_data)
    if errors:
        return jsonify({'error': errors}), 400

    try:
        user = UserService.update_profile(email, json_data)
        return jsonify(user_response_schema.dump(user)), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@user_bp.route('/workers-by-type', methods=['GET'])
def get_workers_by_type():
    work_type = request.args.get('type')
    if not work_type:
        return jsonify({'error': 'Type parameter is required'}), 400
    workers = UserService.get_workers_by_type(work_type)
    return jsonify(users_response_schema.dump(workers)), 200

@user_bp.route('/assign-role', methods=['PUT'])
@firebase_required
def assign_role(firebase_uid, email):
    caller = UserService.get_user_by_email(email)
    if not caller or caller.role != 'ADMIN':
        return jsonify({'error': 'Forbidden'}), 403

    json_data = request.get_json()
    if not json_data:
        return jsonify({'error': 'No input data provided'}), 400

    errors = assign_role_schema.validate(json_data)
    if errors:
        return jsonify({'error': errors}), 400

    try:
        user = UserService.assign_role(json_data['email'], json_data['role'])
        return jsonify({
            'message': 'Role updated successfully',
            'email': user.email,
            'role': user.role
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
