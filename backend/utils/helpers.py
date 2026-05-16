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

    Uses bracket-depth matching for large responses where regex fails.

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

    # Try direct parse first (fastest path)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Bracket-depth matching — finds the outermost { } or [ ] block.
    # Far more reliable than greedy regex for large nested JSON.
    for start_char, end_char in [('{', '}'), ('[', ']')]:
        start_idx = text.find(start_char)
        if start_idx == -1:
            continue

        depth = 0
        in_string = False
        escape_next = False

        for i, ch in enumerate(text[start_idx:], start=start_idx):
            if escape_next:
                escape_next = False
                continue
            if ch == '\\' and in_string:
                escape_next = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == start_char:
                depth += 1
            elif ch == end_char:
                depth -= 1
                if depth == 0:
                    candidate = text[start_idx:i + 1]
                    try:
                        return json.loads(candidate)
                    except json.JSONDecodeError:
                        break  # try next bracket type

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
