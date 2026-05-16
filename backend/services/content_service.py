"""
services/content_service.py — Study material generation and history management
"""

import json as _json
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

from services.gemini_service import generate_content as gemini_generate_content
from utils.supabase_client import get_supabase


# All 7 structured content sections + interactive components expected from Gemini
_CONTENT_SECTIONS = [
    "summary",
    "key_concepts",
    "deep_dive",
    "real_world_applications",
    "viva_voice",
    "best_practices",
    "learning_roadmap",
    "flashcards",
    "recommendations",
    "agent_intro",
]


async def generate_content(
    topic: str,
    level: str,
    score: int,
    user_id: str
) -> Dict[str, Any]:
    """
    Generate personalized study materials and persist the session.

    Returns a dict with all 7 content sections (summary, key_concepts, deep_dive,
    real_world_applications, viva_voice, best_practices,
    learning_roadmap) plus flashcards, recommendations, and agent_intro.

    Args:
        topic:   Learning topic.
        level:   'Beginner' | 'Intermediate' | 'Expert'
        score:   Quiz score 0-10.
        user_id: Authenticated user UUID.

    Returns:
        Full content dict ready for the ContentGenerateResponse schema.
    """
    # Generate content via Gemini (returns all 7 sections + extras)
    content = await gemini_generate_content(topic, level, score)

    # Echo topic + level so the frontend can display them without extra state
    content.setdefault("topic", topic)
    content.setdefault("level", level)

    # ── Normalise key_concepts ─────────────────────────────────────────────
    # Gemini occasionally returns a JSON-encoded string instead of a list.
    kc = content.get("key_concepts")
    if isinstance(kc, str):
        try:
            parsed_kc = _json.loads(kc)
            if isinstance(parsed_kc, list):
                content["key_concepts"] = parsed_kc
            else:
                content["key_concepts"] = [{"term": topic, "definition": kc}]
        except Exception:
            content["key_concepts"] = [{"term": topic, "definition": kc}]

    # ── Normalise flashcards ───────────────────────────────────────────────
    flashcards = content.get("flashcards")
    if isinstance(flashcards, str):
        try:
            parsed_fc = _json.loads(flashcards)
            if isinstance(parsed_fc, list):
                content["flashcards"] = parsed_fc
            else:
                content["flashcards"] = []
        except Exception:
            content["flashcards"] = []

    # ── Normalise recommendations sub-structure ────────────────────────────
    rec = content.get("recommendations")
    if not isinstance(rec, dict):
        content["recommendations"] = {
            "weak_areas": [],
            "next_topics": [],
            "practice_suggestions": [],
            "resources": []
        }
    else:
        rec.setdefault("weak_areas", [])
        rec.setdefault("next_topics", [])
        rec.setdefault("practice_suggestions", [])
        rec.setdefault("resources", [])

    # ── Guarantee all 7 markdown sections are non-empty strings ───────────
    _markdown_defaults = {
        "summary":                 f"## {topic}\n\nSummary for {level} level learners.",
        "deep_dive":               f"## Deep Dive: {topic}\n\nDetailed exploration coming soon.",
        "real_world_applications": f"## Real-World Applications of {topic}\n\nApplications across industries.",
        "viva_voice":              f"## Viva Voice: {topic}\n\nFrequently asked questions.",
        "best_practices":          f"## Best Practices: {topic}\n\nProfessional guidelines.",
        "learning_roadmap":        f"## Learning Roadmap: {topic}\n\nYour path to mastery.",
    }
    for field, default in _markdown_defaults.items():
        if not content.get(field):
            content[field] = default

    # Persist learning session to Supabase (non-critical)
    try:
        _save_history(user_id, topic, score, level)
    except Exception as e:
        print(f"[WARN] Failed to save learning history: {e}")

    return content


def _save_history(user_id: str, topic: str, score: int, level: str) -> None:
    """
    Insert a learning session record into Supabase.

    Args:
        user_id: User UUID.
        topic: Topic string.
        score: Quiz score.
        level: Classified level.
    """
    db = get_supabase()
    db.table("learning_history").insert({
        "user_id":    user_id,
        "topic":      topic,
        "score":      score,
        "level":      level,
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()


def get_history(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Retrieve a user's learning history from Supabase.

    Args:
        user_id: User UUID.
        limit: Maximum records to return.

    Returns:
        List of history records sorted by most recent first.
    """
    db = get_supabase()
    result = (
        db.table("learning_history")
          .select("id, topic, score, level, created_at")
          .eq("user_id", user_id)
          .order("created_at", desc=True)
          .limit(limit)
          .execute()
    )
    return result.data or []
