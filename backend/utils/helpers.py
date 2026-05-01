"""
utils/helpers.py — General-purpose helper functions
"""

import re
import json
from typing import Any, Optional


def classify_level(score: int) -> str:
    """
    Classify proficiency level from quiz score (0–10).

    Args:
        score: Integer score.

    Returns:
        'Beginner' | 'Intermediate' | 'Expert'
    """
    if score <= 4:
        return "Beginner"
    elif score <= 7:
        return "Intermediate"
    else:
        return "Expert"


def extract_json_from_text(text: str) -> Optional[Any]:
    """
    Extract and parse JSON from a text string that may contain
    markdown fences or surrounding prose.

    Args:
        text: Raw text possibly containing JSON.

    Returns:
        Parsed Python object, or None if extraction fails.
    """
    if not text:
        return None

    # Strip markdown code fences
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = text.replace("```", "").strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find a JSON object or array in the text
    patterns = [
        r'\{.*\}',   # JSON object
        r'\[.*\]',   # JSON array
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                continue

    return None


def sanitize_topic(topic: str) -> str:
    """
    Sanitize a topic string: strip, truncate, remove special chars.

    Args:
        topic: Raw topic input.

    Returns:
        Cleaned topic string.
    """
    topic = topic.strip()
    topic = re.sub(r'[<>{}|\\^`]', '', topic)
    return topic[:120]


def safe_int(value: Any, default: int = 0) -> int:
    """Safely convert a value to int."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def truncate(text: str, max_len: int = 500) -> str:
    """Truncate text to max_len characters, appending '...' if needed."""
    if not text:
        return ""
    return text if len(text) <= max_len else text[:max_len - 3] + "..."
