"""
services/agent_service.py — Agentic AI suggestions and chat
"""

from typing import Any, Dict, List

from services.gemini_service import chat_with_agent as gemini_chat


async def chat(
    topic: str,
    level: str,
    message: str,
    history: List[Dict[str, str]]
) -> str:
    """
    Route a student message to the Gemini-powered AI tutor.

    Args:
        topic: Current learning topic.
        level: Student's proficiency level.
        message: Latest student message.
        history: Conversation history list.

    Returns:
        AI tutor reply string.
    """
    # Sanitize message
    message = message.strip()[:1000]

    # Call Gemini agent
    reply = await gemini_chat(
        topic=topic,
        level=level,
        message=message,
        history=history
    )

    return reply
