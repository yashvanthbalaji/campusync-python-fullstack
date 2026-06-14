import os
import logging

import requests as http_requests
from flask import Blueprint, request, jsonify, send_from_directory

from app.extensions import db
from app.firebase_auth import firebase_required
from app.services import complaint_service

log = logging.getLogger(__name__)

AUTH_SERVICE_URL = os.environ.get('AUTH_SERVICE_URL', 'http://localhost:8081')

complaint_bp = Blueprint('complaint', __name__, url_prefix='/api/complaints')


# ── GET /api/complaints/health ──────────────────────────────────────────────
@complaint_bp.route('/health', methods=['GET'])
def health():
    return "Complaint service is UP on port 8082!", 200


# ── POST /api/complaints/raise ──────────────────────────────────────────────
@complaint_bp.route('/raise', methods=['POST'])
@firebase_required
def raise_complaint(**kwargs):
    try:
        email = kwargs.get('email')
        form_data = {
            'title':       request.form.get('title'),
            'description': request.form.get('description'),
            'category':    request.form.get('category', 'OTHER'),
            'roomNumber':  request.form.get('roomNumber', ''),
            'timeOfDay':   request.form.get('timeOfDay', ''),
        }
        image_file = request.files.get('image')

        complaint = complaint_service.raise_complaint(
            student_email    = email,
            form_data        = form_data,
            image_file       = image_file,
            auth_service_url = AUTH_SERVICE_URL,
        )
        return jsonify(complaint.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        log.error("[Routes] POST /raise failed: %s", e)
        return jsonify({'error': str(e)}), 400


# ── GET /api/complaints/my ──────────────────────────────────────────────────
@complaint_bp.route('/my', methods=['GET'])
@firebase_required
def get_my_complaints(**kwargs):
    try:
        email = kwargs.get('email')
        complaints = complaint_service.get_my_complaints(email)
        return jsonify([c.to_dict() for c in complaints]), 200
    except Exception as e:
        log.error("[Routes] GET /my failed: %s", e)
        return jsonify({'error': str(e)}), 400


# ── GET /api/complaints/all ─────────────────────────────────────────────────
@complaint_bp.route('/all', methods=['GET'])
@firebase_required
def get_all_complaints(**kwargs):
    try:
        email = kwargs.get('email')

        # Role check — only WORKER or ADMIN may view all complaints
        try:
            resp = http_requests.get(
                f"{AUTH_SERVICE_URL}/api/users/user/{email}", timeout=5
            )
            if resp.status_code == 200:
                role = resp.json().get('role', '')
                if role not in ('WORKER', 'ADMIN'):
                    return jsonify({'error': 'Access denied'}), 403
        except Exception as e:
            log.warning("⚠️ Role check failed (allowing through): %s", e)

        complaints = complaint_service.get_all_complaints()
        return jsonify([c.to_dict() for c in complaints]), 200
    except Exception as e:
        log.error("[Routes] GET /all failed: %s", e)
        return jsonify({'error': str(e)}), 400


# ── GET /api/complaints/pending ─────────────────────────────────────────────
@complaint_bp.route('/pending', methods=['GET'])
def get_pending_complaints():
    try:
        complaints = complaint_service.get_pending_complaints()
        return jsonify([c.to_dict() for c in complaints]), 200
    except Exception as e:
        log.error("[Routes] GET /pending failed: %s", e)
        return jsonify({'error': str(e)}), 400


# ── GET /api/complaints/my-assigned ────────────────────────────────────────
@complaint_bp.route('/my-assigned', methods=['GET'])
@firebase_required
def get_my_assigned_complaints(**kwargs):
    try:
        email = kwargs.get('email')
        complaints = complaint_service.get_my_assigned_complaints(email)
        return jsonify([c.to_dict() for c in complaints]), 200
    except Exception as e:
        log.error("[Routes] GET /my-assigned failed: %s", e)
        return jsonify({'error': str(e)}), 400


# ── PUT /api/complaints/<id>/resolve ────────────────────────────────────────
@complaint_bp.route('/<int:id>/resolve', methods=['PUT'])
@firebase_required
def resolve_complaint(id, **kwargs):
    try:
        email = kwargs.get('email')

        # Role check — only WORKER or ADMIN may resolve
        try:
            resp = http_requests.get(
                f"{AUTH_SERVICE_URL}/api/users/user/{email}", timeout=5
            )
            if resp.status_code == 200:
                role = resp.json().get('role', '')
                if role not in ('WORKER', 'ADMIN'):
                    return jsonify({'error': 'Access denied'}), 403
        except Exception as e:
            log.warning("⚠️ Role check failed (allowing through): %s", e)

        body        = request.get_json() or {}
        worker_note = body.get('workerNote', '')

        complaint = complaint_service.resolve_complaint(id, worker_note, email)
        return jsonify(complaint.to_dict()), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        db.session.rollback()
        log.error("[Routes] PUT /%s/resolve failed: %s", id, e)
        return jsonify({'error': str(e)}), 400


# ── PUT /api/complaints/update-status/<id> ──────────────────────────────────
@complaint_bp.route('/update-status/<int:id>', methods=['PUT'])
def update_status(id):
    try:
        new_status = request.args.get('status')
        if not new_status:
            return jsonify({'error': "'status' query parameter is required"}), 400

        complaint = complaint_service.update_status(id, new_status)
        return jsonify(complaint.to_dict()), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        db.session.rollback()
        log.error("[Routes] PUT /update-status/%s failed: %s", id, e)
        return jsonify({'error': str(e)}), 400


# ── GET /api/complaints/images/<filename> ───────────────────────────────────
@complaint_bp.route('/images/<filename>', methods=['GET'])
def get_image(filename):
    try:
        upload_dir = os.path.abspath('uploads/complaints')
        return send_from_directory(upload_dir, filename)
    except FileNotFoundError:
        return jsonify({'error': 'Image not found'}), 404


# ── PUT /api/complaints/assign-unassigned (internal) ────────────────────────
@complaint_bp.route('/assign-unassigned', methods=['PUT'])
def assign_unassigned():
    try:
        body         = request.get_json() or {}
        work_type    = body.get('workType')
        worker_email = body.get('workerEmail')

        if not work_type or not worker_email:
            return jsonify({'error': "'workType' and 'workerEmail' are required"}), 400

        count = complaint_service.assign_unassigned_complaints(work_type, worker_email)
        return jsonify({
            'assigned':    count,
            'workType':    work_type,
            'workerEmail': worker_email,
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error("[Routes] PUT /assign-unassigned failed: %s", e)
        return jsonify({'error': str(e)}), 400
