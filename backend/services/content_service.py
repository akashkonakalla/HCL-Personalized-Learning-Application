"""
services/content_service.py — Study material generation and history management
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

from services.gemini_service import generate_content as gemini_generate_content
from utils.supabase_client import get_supabase


async def generate_content(
    topic: str,
    level: str,
    score: int,
    user_id: str
) -> Dict[str, Any]:
    """
    Generate personalized study materials and persist the session.

    Args:
        topic: Learning topic.
        level: 'Beginner' | 'Intermediate' | 'Expert'
        score: Quiz score 0-10.
        user_id: Authenticated user's ID.

    Returns:
        Full content dict with summary, key_concepts, details,
        flashcards, recommendations, agent_intro.
    """
    # Generate content via Gemini
    content = await gemini_generate_content(topic, level, score)

    # Persist learning session to Supabase
    try:
        _save_history(user_id, topic, score, level)
    except Exception as e:
        # Non-critical — don't fail content generation if DB write fails
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
