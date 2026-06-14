import os
import re
import base64
import logging
import requests

from app.models.models import LostFoundItem

log = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GEMINI_API_URL = os.environ.get('GEMINI_API_URL', '')
UPLOAD_FOLDER = 'uploads/lostfound'


# ──────────────────────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────────────────────

def image_to_base64(filename):
    """Read uploads/lostfound/{filename} and return a base64 string, or None."""
    try:
        if not filename:
            return None
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(filepath):
            log.warning("[GeminiService] File not found: %s", filepath)
            return None
        with open(filepath, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    except Exception as e:
        log.warning("[GeminiService] Image read error for '%s': %s", filename, e)
        return None


def parse_match_response(text):
    """
    Parse Gemini's MATCH / NO_MATCH response.
    Check NO_MATCH first to avoid 'MATCH' substring false-positives.
    Falls back to True if response is unclear.
    """
    if text is None:
        return True
    upper = text.strip().upper()
    if 'NO_MATCH' in upper:
        return False
    if 'MATCH' in upper:
        return True
    return True  # unclear → conservative fallback


# ──────────────────────────────────────────────────────────────
#  Vision API (image comparison)
# ──────────────────────────────────────────────────────────────

def call_gemini_vision(lost_b64, lost_desc, found_b64, found_desc):
    """Send two images to Gemini Vision and ask if they are the same object."""
    try:
        prompt = (
            f"You are an AI for a college Lost & Found system. "
            f"Image 1 is a reported LOST item: '{lost_desc}'. "
            f"Image 2 is a reported FOUND item: '{found_desc}'. "
            f"The photos may be taken from different angles or lighting. "
            f"Is there a HIGH probability these are the SAME physical object? "
            f"Reply with exactly one word: MATCH or NO_MATCH"
        )

        payload = {
            "contents": [{
                "parts": [
                    {"inline_data": {"mime_type": "image/jpeg", "data": lost_b64}},
                    {"inline_data": {"mime_type": "image/jpeg", "data": found_b64}},
                    {"text": prompt}
                ]
            }]
        }

        resp = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            json=payload,
            timeout=30
        )
        resp.raise_for_status()

        text = resp.json()['candidates'][0]['content']['parts'][0]['text'].strip()
        log.info("[GeminiVision] lost='%s' found='%s' → '%s'", lost_desc, found_desc, text)
        return parse_match_response(text)

    except Exception as e:
        log.error("[GeminiVision] Call failed — fallback true: %s", e)
        return True


# ──────────────────────────────────────────────────────────────
#  Text API (description-only comparison)
# ──────────────────────────────────────────────────────────────

def call_gemini_text(lost_name, lost_desc, found_name, found_desc, area):
    """Send text descriptions to Gemini and ask if they match."""
    try:
        prompt = (
            f"You are a Lost & Found AI assistant at a college hostel. "
            f"A student lost: '{lost_name}' described as '{lost_desc}'. "
            f"Another student found: '{found_name}' described as '{found_desc}'. "
            f"Both items were reported near the same area: {area}. "
            f"Even if descriptions are slightly different "
            f"(different angles, lighting, or wording), "
            f"is there a reasonable chance these could be the SAME physical object? "
            f"Reply with exactly one word: MATCH or NO_MATCH"
        )

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }

        resp = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            json=payload,
            timeout=30
        )
        resp.raise_for_status()

        text = resp.json()['candidates'][0]['content']['parts'][0]['text'].strip()
        log.info("[GeminiText] lost='%s' found='%s' area='%s' → '%s'",
                 lost_name, found_name, area, text)
        return parse_match_response(text)

    except Exception as e:
        log.error("[GeminiText] Call failed — fallback true: %s", e)
        return True


# ──────────────────────────────────────────────────────────────
#  Public Entry Point — matching
# ──────────────────────────────────────────────────────────────

def is_likely_same_item(lost_item, found_item):
    """
    Main matching method — automatically picks Vision or Text API.
    Both args are LostFoundItem model instances.
    """
    lost_b64 = image_to_base64(lost_item.image_url)
    found_b64 = image_to_base64(found_item.image_url)

    if lost_b64 and found_b64:
        log.info("[GeminiMatching] Both images available — using VISION API")
        return call_gemini_vision(
            lost_b64, f"{lost_item.item_name} {lost_item.description}",
            found_b64, f"{found_item.item_name} {found_item.description}"
        )
    else:
        log.info("[GeminiMatching] Image(s) missing — using TEXT API")
        return call_gemini_text(
            lost_item.item_name, lost_item.description,
            found_item.item_name, found_item.description,
            lost_item.location_category
        )


# ══════════════════════════════════════════════════════════════
#  AI Pre-Tagging — called ONCE on upload
# ══════════════════════════════════════════════════════════════

def generate_tags_for_item(filename, item_name):
    """
    Call Gemini Vision once when a new item is uploaded.
    Generates descriptive keywords saved to the aiTags column.
    Returns comma-separated tag string, or None on failure.
    """
    b64 = image_to_base64(filename)
    if b64 is None:
        log.warning("[GeminiTags] No image available for '%s' — returning None", item_name)
        return None

    try:
        prompt = (
            f"Generate exactly 10 descriptive keywords for this item named '{item_name}'. "
            f"Include color, material, brand, size, shape, type. "
            f"Reply ONLY with comma-separated keywords, lowercase, no other text."
        )

        payload = {
            "contents": [{
                "parts": [
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64}},
                    {"text": prompt}
                ]
            }]
        }

        resp = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            json=payload,
            timeout=30
        )
        resp.raise_for_status()

        raw_text = resp.json()['candidates'][0]['content']['parts'][0]['text'].strip()
        # Clean: lowercase, keep only alphanumeric + commas + spaces
        tags = raw_text.lower()
        tags = re.sub(r'[^a-z0-9,\s]', '', tags)
        tags = re.sub(r'\s+', ' ', tags).strip()

        log.info("[GeminiTags] ✅ Tags generated for '%s': '%s'", item_name, tags)
        return tags

    except Exception as e:
        log.error("[GeminiTags] API call failed for '%s': %s — returning None", item_name, e)
        return None


# ══════════════════════════════════════════════════════════════
#  AI Search — instant SQL search, NO Gemini calls
# ══════════════════════════════════════════════════════════════

def search_by_description(query):
    """
    Search items using fast SQL text search on ai_tags + item_name.
    NO Gemini API calls — uses pre-generated tags stored in the DB.
    Returns deduplicated list of LostFoundItem model instances.
    """
    trimmed = query.strip()
    log.info("[GeminiSearch] SQL search for: '%s'", trimmed)

    seen_ids = set()
    results = []

    # Full phrase first (exact matches appear at top)
    phrase_matches = LostFoundItem.query.filter(
        db.or_(
            LostFoundItem.ai_tags.ilike(f'%{trimmed}%'),
            LostFoundItem.item_name.ilike(f'%{trimmed}%')
        )
    ).all()

    for item in phrase_matches:
        if item.id not in seen_ids:
            seen_ids.add(item.id)
            results.append(item)

    # Word-by-word search for multi-word queries
    words = trimmed.split()
    if len(words) > 1:
        for word in words:
            if len(word) < 2:
                continue  # skip single-char noise
            word_matches = LostFoundItem.query.filter(
                db.or_(
                    LostFoundItem.ai_tags.ilike(f'%{word}%'),
                    LostFoundItem.item_name.ilike(f'%{word}%')
                )
            ).all()
            for item in word_matches:
                if item.id not in seen_ids:
                    seen_ids.add(item.id)
                    results.append(item)

    log.info("[GeminiSearch] Found %d items for query='%s'", len(results), trimmed)
    return results


# Need db.or_ for search_by_description
from app.extensions import db
