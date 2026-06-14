import logging
from flask import Blueprint, request, jsonify
from sqlalchemy import func

from app.extensions import db
from app.models.models import Notification

log = logging.getLogger(__name__)

notification_bp = Blueprint('notification', __name__, url_prefix='/api/notifications')


# ── GET /api/notifications/health ───────────────────────────────────────────
@notification_bp.route('/health', methods=['GET'])
def health():
    return "Notification service is UP on port 8084!", 200


# ── GET /api/notifications/my ────────────────────────────────────────────────
@notification_bp.route('/my', methods=['GET'])
def get_my_notifications():
    """
    Returns all notifications for the user identified by X-User-Email header,
    ordered newest first. Mirrors Java: findByRecipientEmailOrderByCreatedAtDesc
    """
    email = request.headers.get('X-User-Email')
    if not email:
        return jsonify({'error': 'X-User-Email header required'}), 400

    notifications = (
        Notification.query
        .filter_by(recipient_email=email)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return jsonify([n.to_dict() for n in notifications]), 200


# ── GET /api/notifications/unread-count ─────────────────────────────────────
@notification_bp.route('/unread-count', methods=['GET'])
def get_unread_count():
    """
    Returns {'count': <int>} for unread notifications.
    Mirrors Java: countByRecipientEmailAndIsReadFalse
    """
    email = request.headers.get('X-User-Email')
    if not email:
        return jsonify({'error': 'X-User-Email header required'}), 400

    count = (
        db.session.query(func.count(Notification.id))
        .filter(
            Notification.recipient_email == email,
            Notification.is_read == False  # noqa: E712
        )
        .scalar()
    )
    return jsonify({'count': count}), 200


# ── PUT /api/notifications/mark-read/<id> ───────────────────────────────────
@notification_bp.route('/mark-read/<int:id>', methods=['PUT'])
def mark_as_read(id):
    """
    Marks a single notification as read.
    Mirrors Java: findById(id).ifPresent(n -> n.setRead(true))
    """
    notification = Notification.query.get(id)
    if notification:
        notification.is_read = True
        db.session.commit()
    return '', 200


# ── PUT /api/notifications/mark-all-read ────────────────────────────────────
@notification_bp.route('/mark-all-read', methods=['PUT'])
def mark_all_read():
    """
    Marks all unread notifications for a user as read.
    Mirrors Java: findByRecipientEmailAndIsReadFalse -> saveAll
    """
    email = request.headers.get('X-User-Email')
    if not email:
        return jsonify({'error': 'X-User-Email header required'}), 400

    Notification.query.filter_by(
        recipient_email=email,
        is_read=False
    ).update({'is_read': True})
    db.session.commit()
    return '', 200
