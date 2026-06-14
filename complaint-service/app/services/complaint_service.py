import logging
from datetime import datetime

import requests as http_requests

from app.extensions import db
from app.models.models import Complaint
from app.utils.file_utils import save_file
from app.kafka.producer import (
    send_complaint_event,
    build_new_complaint_message,
    build_resolved_message,
)

log = logging.getLogger(__name__)

# ── Category → WorkType mapping (Java switch parity) ───────────────────────
CATEGORY_TO_WORK_TYPE = {
    'ELECTRICAL':           'ELECTRICAL',
    'PLUMBING':             'PLUMBING',
    'CLEANING':             'CLEANING',
    'AC_REPAIR':            'AC_REPAIR',
    'CARPENTRY':            'CARPENTRY',
    'PAINTING':             'PAINTING',
    'GENERAL_MAINTENANCE':  'GENERAL_MAINTENANCE',
    'PEST_CONTROL':         'PEST_CONTROL',
    'MAINTENANCE':          'GENERAL_MAINTENANCE',
    'CLEANLINESS':          'CLEANING',
    'FOOD':                 'OTHER',
    'OTHER':                'OTHER',
}


def map_category_to_work_type(category):
    """Case-insensitive lookup; returns 'OTHER' if not found."""
    if not category:
        return 'OTHER'
    return CATEGORY_TO_WORK_TYPE.get(category.upper(), 'OTHER')


# ── Auto-assign worker ──────────────────────────────────────────────────────
def auto_assign_worker(complaint, auth_service_url):
    """Non-fatal: fetches first available worker by work_type and assigns."""
    if complaint.work_type == 'OTHER':
        log.info("WorkType is OTHER — skipping auto-assignment for complaint %s", complaint.id)
        return
    try:
        url = f"{auth_service_url}/api/users/workers-by-type?type={complaint.work_type}"
        resp = http_requests.get(url, timeout=5)
        if resp.status_code == 200:
            workers = resp.json()
            if workers:
                worker = workers[0]
                complaint.assigned_worker_email = worker.get('email')
                complaint.assigned_worker_name  = worker.get('name')
                db.session.commit()
                log.info(
                    "Auto-assigned complaint %s to worker %s",
                    complaint.id,
                    complaint.assigned_worker_email,
                )
            else:
                log.info("No workers of type %s available for auto-assignment", complaint.work_type)
        else:
            log.warning("Workers-by-type endpoint returned %s", resp.status_code)
    except Exception as e:
        log.warning("⚠️ auto_assign_worker failed (non-fatal): %s", e)


# ── Raise a new complaint ───────────────────────────────────────────────────
def raise_complaint(student_email, form_data, image_file, auth_service_url):
    """
    Creates, persists, auto-assigns, and fires Kafka event for a new complaint.
    Returns the saved Complaint instance.
    """
    # 1. Map category → work_type
    category  = form_data.get('category', 'OTHER')
    work_type = map_category_to_work_type(category)

    # 2. Save image (if provided)
    image_path = None
    if image_file and image_file.filename:
        image_path = save_file(image_file, 'complaints')

    # 3. Fetch student name (non-fatal)
    student_name = None
    try:
        url  = f"{auth_service_url}/api/users/user/{student_email}"
        resp = http_requests.get(url, timeout=5)
        if resp.status_code == 200:
            student_name = resp.json().get('name')
    except Exception as e:
        log.warning("⚠️ Could not fetch student name (non-fatal): %s", e)

    # 4. Build Complaint entity
    complaint = Complaint(
        student_email = student_email,
        student_name  = student_name,
        title         = form_data.get('title'),
        description   = form_data.get('description'),
        category      = category,
        work_type     = work_type,
        room_number   = form_data.get('roomNumber') or form_data.get('room_number'),
        time_of_day   = form_data.get('timeOfDay') or form_data.get('time_of_day'),
        image_path    = image_path,
        status        = 'PENDING',
        created_at    = datetime.utcnow(),
    )

    # 5. Persist
    db.session.add(complaint)
    db.session.commit()

    # 6. Auto-assign worker
    auto_assign_worker(complaint, auth_service_url)

    # 7. Kafka event
    send_complaint_event(build_new_complaint_message(complaint))

    # 8. Return
    return complaint


# ── Queries ─────────────────────────────────────────────────────────────────
def get_my_complaints(student_email):
    """All complaints by a given student, newest first."""
    return (
        Complaint.query
        .filter_by(student_email=student_email)
        .order_by(Complaint.created_at.desc())
        .all()
    )


def get_all_complaints():
    """All complaints, newest first."""
    return Complaint.query.order_by(Complaint.created_at.desc()).all()


def get_my_assigned_complaints(worker_email):
    """Complaints assigned to a specific worker, newest first."""
    return (
        Complaint.query
        .filter_by(assigned_worker_email=worker_email)
        .order_by(Complaint.created_at.desc())
        .all()
    )


def get_pending_complaints():
    """Complaints that are PENDING or IN_PROGRESS, newest first."""
    return (
        Complaint.query
        .filter(Complaint.status.in_(['PENDING', 'IN_PROGRESS']))
        .order_by(Complaint.created_at.desc())
        .all()
    )


# ── Mutations ────────────────────────────────────────────────────────────────
def resolve_complaint(complaint_id, worker_note, worker_email):
    """
    Marks complaint RESOLVED, fires Kafka event.
    Raises ValueError if complaint not found.
    """
    complaint = Complaint.query.get(complaint_id)
    if not complaint:
        raise ValueError(f"Complaint {complaint_id} not found")

    complaint.status              = 'RESOLVED'
    complaint.resolved_at         = datetime.utcnow()
    complaint.resolved_by_worker  = worker_email
    complaint.worker_note         = worker_note
    db.session.commit()

    send_complaint_event(build_resolved_message(complaint, worker_email, worker_note))
    return complaint


def update_status(complaint_id, new_status):
    """Sets the status of a complaint to new_status. Raises ValueError if not found."""
    complaint = Complaint.query.get(complaint_id)
    if not complaint:
        raise ValueError(f"Complaint {complaint_id} not found")

    complaint.status = new_status
    db.session.commit()
    return complaint


def assign_unassigned_complaints(work_type, worker_email):
    """
    Bulk-assigns all unassigned complaints of a given work_type to worker_email.
    Returns the count of newly assigned complaints.
    """
    complaints = (
        Complaint.query
        .filter_by(work_type=work_type, assigned_worker_email=None)
        .all()
    )
    for c in complaints:
        c.assigned_worker_email = worker_email
    db.session.commit()
    log.info(
        "Assigned %d complaint(s) of work_type=%s to worker %s",
        len(complaints), work_type, worker_email,
    )
    return len(complaints)
