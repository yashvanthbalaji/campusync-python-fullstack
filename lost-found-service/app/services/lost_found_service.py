import os
import logging
import requests as http_requests

from sqlalchemy import case

from app.extensions import db
from app.models.models import LostFoundItem
from app.services import gemini_service
from app.kafka.producer import send_match_event
from app.utils.file_utils import save_file

log = logging.getLogger(__name__)

AUTH_SERVICE_URL = os.environ.get('AUTH_SERVICE_URL', 'http://localhost:8081')

# ──────────────────────────────────────────────────────────────
#  Priority sorting: HIGH=1, MEDIUM=2, LOW=3, else=4
# ──────────────────────────────────────────────────────────────
PRIORITY_ORDER = case(
    (LostFoundItem.priority == 'HIGH', 1),
    (LostFoundItem.priority == 'MEDIUM', 2),
    (LostFoundItem.priority == 'LOW', 3),
    else_=4
)


# ──────────────────────────────────────────────────────────────
#  Report a new item
# ──────────────────────────────────────────────────────────────

def report_item(reporter_email, form_data, image_path):
    """
    Reports a new lost or found item, persists it, fetches reporter info,
    generates AI tags, then runs the Gemini-enhanced matching algorithm.
    """
    item = LostFoundItem(
        reporter_email=reporter_email,
        item_name=form_data['itemName'],
        description=form_data.get('description', ''),
        type=form_data['type'],
        priority=form_data['priority'],
        location_category=form_data['locationCategory'],
        location_floor=form_data['locationFloor'],
        match_status='UNMATCHED',
        item_status='OPEN',
        status='OPEN',
        image_url=image_path
    )
    db.session.add(item)
    db.session.commit()

    # ══ Fetch reporter contact info from auth-service (non-fatal) ══
    try:
        url = f"{AUTH_SERVICE_URL}/api/users/user/{reporter_email}"
        resp = http_requests.get(url, timeout=5)
        if resp.status_code == 200:
            user_info = resp.json()
            item.reporter_name = user_info.get('name')
            item.reporter_phone = user_info.get('phoneNumber')
            item.student_type = user_info.get('studentType') or 'HOSTEL'
            db.session.commit()
            log.info("👤 Reporter info fetched: name='%s' phone='%s' studentType='%s'",
                     user_info.get('name'), user_info.get('phoneNumber'),
                     item.student_type)
    except Exception as e:
        item.student_type = 'HOSTEL'
        db.session.commit()
        log.warning("⚠️ Could not fetch reporter info (non-fatal): %s", e)

    # ══ AI Pre-Tagging: generate tags once on upload (non-fatal) ══
    if image_path:
        try:
            tags = gemini_service.generate_tags_for_item(image_path, form_data['itemName'])
            if tags:
                item.ai_tags = tags
                db.session.commit()
                log.info("🏷️ AI tags generated for item ID:%s: '%s'", item.id, tags)
        except Exception as e:
            log.warning("⚠️ Tag generation failed for item ID:%s (non-fatal): %s",
                        item.id, e)

    # Run Gemini-enhanced matching algorithm after saving
    run_matching_algorithm(item)

    # Re-fetch to get latest state after matching
    db.session.refresh(item)
    return item


# ──────────────────────────────────────────────────────────────
#  Gemini-enhanced matching algorithm
# ──────────────────────────────────────────────────────────────

def run_matching_algorithm(new_item):
    """
    Finds UNMATCHED items of the opposite type at the same location area,
    then uses Gemini to confirm if they are likely the same item.
    On confirmation → marks both POTENTIAL_MATCH + PENDING_HANDOVER.
    Floor is intentionally NOT filtered — items can move between floors.
    """
    opposite_type = 'FOUND' if new_item.type == 'LOST' else 'LOST'

    candidates = LostFoundItem.query.filter(
        LostFoundItem.type == opposite_type,
        LostFoundItem.location_category == new_item.location_category,
        LostFoundItem.match_status == 'UNMATCHED',
        LostFoundItem.id != new_item.id,
        LostFoundItem.student_type == new_item.student_type
    ).all()

    if not candidates:
        return

    for candidate in candidates:
        # Determine which is LOST and which is FOUND
        lost_item = new_item if new_item.type == 'LOST' else candidate
        found_item = new_item if new_item.type == 'FOUND' else candidate

        gemini_confirms = gemini_service.is_likely_same_item(lost_item, found_item)

        if gemini_confirms:
            # Flag new item
            new_item.match_status = 'POTENTIAL_MATCH'
            new_item.matched_with_id = candidate.id
            new_item.item_status = 'PENDING_HANDOVER'

            # Flag matched candidate
            candidate.match_status = 'POTENTIAL_MATCH'
            candidate.matched_with_id = new_item.id
            candidate.item_status = 'PENDING_HANDOVER'

            db.session.commit()

            log.info("🔗 GEMINI MATCH FOUND: %s (ID:%s) ↔ %s (ID:%s) | Area: %s",
                     new_item.item_name, new_item.id,
                     candidate.item_name, candidate.id,
                     new_item.location_category)

            # Send Kafka notification event
            send_match_event(
                lost_item.reporter_email,
                found_item.reporter_email,
                lost_item.id,
                found_item.id,
                new_item.item_name
            )

            return  # match found — stop checking further candidates

    log.info("No Gemini match for item ID:%s at %s — remains UNMATCHED",
             new_item.id, new_item.location_category)


# ──────────────────────────────────────────────────────────────
#  Resolve / Confirm handover
# ──────────────────────────────────────────────────────────────

def confirm_resolved(item_id):
    """
    Marks an item (and its matched partner) as RESOLVED + CONFIRMED.
    Called when the hostel warden confirms the item has been handed over.
    """
    item = LostFoundItem.query.get_or_404(item_id, description=f"Item not found: {item_id}")

    item.item_status = 'RESOLVED'
    item.match_status = 'CONFIRMED'

    # Also resolve the paired item
    if item.matched_with_id:
        partner = LostFoundItem.query.get(item.matched_with_id)
        if partner:
            partner.item_status = 'RESOLVED'
            partner.match_status = 'CONFIRMED'
            log.info("✅ Paired item ID:%s also resolved", partner.id)

    db.session.commit()
    return item


# ──────────────────────────────────────────────────────────────
#  Query methods
# ──────────────────────────────────────────────────────────────

def get_all_items(viewer_student_type=None):
    """Returns all items sorted by priority (HIGH first), then by created_at desc.
    If viewer_student_type is provided, filters to only that type."""
    query = LostFoundItem.query
    if viewer_student_type:
        query = query.filter_by(student_type=viewer_student_type)
    return query.order_by(
        PRIORITY_ORDER,
        LostFoundItem.created_at.desc()
    ).all()


def get_by_type(item_type, viewer_student_type=None):
    """Returns items of a given type, sorted by priority then created_at desc.
    If viewer_student_type is provided, filters to only that type."""
    query = LostFoundItem.query.filter_by(type=item_type)
    if viewer_student_type:
        query = query.filter_by(student_type=viewer_student_type)
    return query.order_by(
        PRIORITY_ORDER,
        LostFoundItem.created_at.desc()
    ).all()


def get_my_items(email):
    """Returns items reported by the given email, newest first."""
    return LostFoundItem.query.filter_by(
        reporter_email=email
    ).order_by(LostFoundItem.created_at.desc()).all()


def get_potential_matches():
    """Returns all items currently flagged as POTENTIAL_MATCH."""
    return LostFoundItem.query.filter_by(match_status='POTENTIAL_MATCH').all()


def get_matched_pair_details(item_id):
    """
    Returns the item AND its matched partner's details.
    Response: {'item': {...}, 'matchedWith': {...} or None}
    """
    item = LostFoundItem.query.get_or_404(item_id, description=f"Item not found: {item_id}")

    result = {'item': item.to_dict(), 'matchedWith': None}

    if item.matched_with_id:
        partner = LostFoundItem.query.get(item.matched_with_id)
        if partner:
            result['matchedWith'] = partner.to_dict()

    return result


# ──────────────────────────────────────────────────────────────
#  Status updates
# ──────────────────────────────────────────────────────────────

def update_status(item_id, new_status):
    """Updates the legacy String status field (e.g. OPEN → CLAIMED)."""
    item = LostFoundItem.query.get_or_404(item_id, description=f"Item not found: {item_id}")
    item.status = new_status
    db.session.commit()
    return item


def update_item_status(item_id, new_item_status):
    """
    Updates the structured item_status field.
    If marking as RESOLVED, also updates legacy status for compatibility.
    """
    item = LostFoundItem.query.get_or_404(item_id, description=f"Item not found: {item_id}")
    item.item_status = new_item_status.upper()

    # If marking as RESOLVED, also update the legacy status for compatibility
    if new_item_status.upper() == 'RESOLVED':
        item.status = 'RESOLVED'

    db.session.commit()
    log.info("🟢 Item ID:%s itemStatus updated to: %s", item_id, new_item_status)
    return item


def get_items_by_item_status(status):
    """Returns items filtered by item_status value."""
    return LostFoundItem.query.filter_by(item_status=status).all()
