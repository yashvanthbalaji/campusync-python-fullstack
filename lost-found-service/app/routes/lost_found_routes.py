import os
import logging
import requests as http_requests
from flask import Blueprint, request, jsonify, send_from_directory
from marshmallow import ValidationError

from app.extensions import db
from app.firebase_auth import firebase_required
from app.schemas.schemas import LostFoundResponseSchema, LostFoundRequestSchema
from app.services import lost_found_service
from app.services import gemini_service
from app.utils.file_utils import save_file

log = logging.getLogger(__name__)

AUTH_SERVICE_URL = os.environ.get('AUTH_SERVICE_URL', 'http://localhost:8081')

lost_found_bp = Blueprint('lost_found', __name__, url_prefix='/api/lost-found')

response_schema = LostFoundResponseSchema()
response_schema_many = LostFoundResponseSchema(many=True)
request_schema = LostFoundRequestSchema()


# ── GET /api/lost-found/health ──────────────────────────────────────
@lost_found_bp.route('/health', methods=['GET'])
def health():
    return "Lost & Found service is UP on port 8083!", 200


# ── POST /api/lost-found ────────────────────────────────────────────
@lost_found_bp.route('/', methods=['POST'])
@lost_found_bp.route('', methods=['POST'])
@firebase_required
def report_item(**kwargs):
    try:
        email = kwargs.get('email')

        # Role check — only STUDENT can use Lost & Found
        try:
            url = f"{AUTH_SERVICE_URL}/api/users/user/{email}"
            resp = http_requests.get(url, timeout=5)
            if resp.status_code == 200:
                user_info = resp.json()
                if user_info.get('role') != 'STUDENT':
                    return jsonify({'error': 'Only students can use Lost & Found'}), 403
        except Exception as e:
            log.warning("⚠️ Role check failed (allowing request): %s", e)

        # Validate form fields
        errors = request_schema.validate(request.form)
        if errors:
            return jsonify({'errors': errors}), 400

        data = request_schema.load(request.form)

        # Save image if provided
        image_path = None
        image = request.files.get('image')
        if image and image.filename:
            image_path = save_file(image)

        item = lost_found_service.report_item(email, data, image_path)
        return jsonify(response_schema.dump(item.to_dict())), 201

    except Exception as e:
        db.session.rollback()
        log.error("[Routes] POST / failed: %s", e)
        return jsonify({'error': str(e)}), 400


# ── GET /api/lost-found/all ─────────────────────────────────────────
@lost_found_bp.route('/all', methods=['GET'])
def get_all_items():
    try:
        viewer_student_type = 'HOSTEL'  # default
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            try:
                from firebase_admin import auth as fb_auth
                decoded = fb_auth.verify_id_token(token)
                email = decoded.get('email')
                if email:
                    url = f"{AUTH_SERVICE_URL}/api/users/user/{email}"
                    resp = http_requests.get(url, timeout=5)
                    if resp.status_code == 200:
                        viewer_student_type = resp.json().get('studentType') or 'HOSTEL'
            except Exception as e:
                log.warning("⚠️ Token verification or user fetch failed (defaulting HOSTEL): %s", e)

        items = lost_found_service.get_all_items(viewer_student_type)
        return jsonify(response_schema_many.dump([i.to_dict() for i in items])), 200
    except Exception as e:
        log.error("[Routes] GET /all failed: %s", e)
        return jsonify({'error': str(e)}), 400


# ── GET /api/lost-found/my ──────────────────────────────────────────
@lost_found_bp.route('/my', methods=['GET'])
@firebase_required
def get_my_items(**kwargs):
    try:
        email = kwargs.get('email')
        items = lost_found_service.get_my_items(email)
        return jsonify(response_schema_many.dump([i.to_dict() for i in items])), 200
    except Exception as e:
        log.error("[Routes] GET /my failed: %s", e)
        return jsonify({'error': str(e)}), 400


# ── GET /api/lost-found/type?type=LOST ──────────────────────────────
@lost_found_bp.route('/type', methods=['GET'])
def get_by_type():
    try:
        item_type = request.args.get('type')
        if not item_type:
            return jsonify({'error': 'type parameter is required'}), 400

        viewer_student_type = 'HOSTEL'  # default
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            try:
                from firebase_admin import auth as fb_auth
                decoded = fb_auth.verify_id_token(token)
                email = decoded.get('email')
                if email:
                    url = f"{AUTH_SERVICE_URL}/api/users/user/{email}"
                    resp = http_requests.get(url, timeout=5)
                    if resp.status_code == 200:
                        viewer_student_type = resp.json().get('studentType') or 'HOSTEL'
            except Exception as e:
                log.warning("⚠️ Token verification or user fetch failed (defaulting HOSTEL): %s", e)

        items = lost_found_service.get_by_type(item_type, viewer_student_type)
        return jsonify(response_schema_many.dump([i.to_dict() for i in items])), 200
    except Exception as e:
        log.error("[Routes] GET /type failed: %s", e)
        return jsonify({'error': str(e)}), 400


# ── GET /api/lost-found/matches ─────────────────────────────────────
@lost_found_bp.route('/matches', methods=['GET'])
def get_potential_matches():
    try:
        matches = lost_found_service.get_potential_matches()
        return jsonify(response_schema_many.dump([i.to_dict() for i in matches])), 200
    except Exception as e:
        log.error("[Routes] GET /matches failed: %s", e)
        return jsonify({'error': str(e)}), 400


# ── GET /api/lost-found/{id}/match-details ──────────────────────────
@lost_found_bp.route('/<int:id>/match-details', methods=['GET'])
def get_match_details(id):
    try:
        details = lost_found_service.get_matched_pair_details(id)
        return jsonify(details), 200
    except Exception as e:
        log.error("[Routes] GET /%s/match-details failed: %s", id, e)
        return jsonify({'error': str(e)}), 400


# ── PUT /api/lost-found/status/{id} ─────────────────────────────────
@lost_found_bp.route('/status/<int:id>', methods=['PUT'])
def update_item_status(id):
    try:
        body = request.get_json()
        item_status = body.get('itemStatus') if body else None
        if not item_status:
            return jsonify({'error': "Missing 'itemStatus' field in request body"}), 400

        item = lost_found_service.update_item_status(id, item_status)
        return jsonify(response_schema.dump(item.to_dict())), 200
    except Exception as e:
        db.session.rollback()
        log.error("[Routes] PUT /status/%s failed: %s", id, e)
        return jsonify({'error': str(e)}), 400


# ── PUT /api/lost-found/{id}/resolve ────────────────────────────────
@lost_found_bp.route('/<int:id>/resolve', methods=['PUT'])
def confirm_resolved(id):
    try:
        item = lost_found_service.confirm_resolved(id)
        return jsonify(response_schema.dump(item.to_dict())), 200
    except Exception as e:
        db.session.rollback()
        log.error("[Routes] PUT /%s/resolve failed: %s", id, e)
        return jsonify({'error': str(e)}), 400


# ── PUT /api/lost-found/{id}/status?status=CLAIMED ──────────────────
@lost_found_bp.route('/<int:id>/status', methods=['PUT'])
def update_status(id):
    try:
        status = request.args.get('status')
        if not status:
            return jsonify({'error': 'status query parameter is required'}), 400
        item = lost_found_service.update_status(id, status)
        return jsonify(response_schema.dump(item.to_dict())), 200
    except Exception as e:
        db.session.rollback()
        log.error("[Routes] PUT /%s/status failed: %s", id, e)
        return jsonify({'error': str(e)}), 400


# ── GET /api/lost-found/by-item-status?status=PENDING_HANDOVER ──────
@lost_found_bp.route('/by-item-status', methods=['GET'])
def get_by_item_status():
    try:
        status = request.args.get('status')
        if not status:
            return jsonify({'error': 'status query parameter is required'}), 400
        items = lost_found_service.get_items_by_item_status(status)
        return jsonify(response_schema_many.dump([i.to_dict() for i in items])), 200
    except Exception as e:
        log.error("[Routes] GET /by-item-status failed: %s", e)
        return jsonify({'error': str(e)}), 400


# ── GET /api/lost-found/search?query=mouse ──────────────────────────
@lost_found_bp.route('/search', methods=['GET'])
def search():
    try:
        query = request.args.get('query')
        if not query:
            return jsonify({'error': 'query parameter is required'}), 400
        items = gemini_service.search_by_description(query)
        return jsonify(response_schema_many.dump([i.to_dict() for i in items])), 200
    except Exception as e:
        log.error("[Routes] GET /search failed: %s", e)
        return jsonify({'error': str(e)}), 400


# ── GET /api/lost-found/images/{filename} ───────────────────────────
@lost_found_bp.route('/images/<filename>', methods=['GET'])
def get_image(filename):
    try:
        upload_dir = os.path.abspath('uploads/lostfound')
        return send_from_directory(upload_dir, filename)
    except FileNotFoundError:
        return jsonify({'error': 'Image not found'}), 404
