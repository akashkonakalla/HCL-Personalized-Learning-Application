"""
routes/learning.py — Learning endpoints
POST /learning/generate-quiz
POST /learning/submit-quiz
POST /learning/generate-content
GET  /learning/history
POST /learning/agent-chat
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from schemas.learning_schema import (
    QuizGenerateRequest, QuizGenerateResponse,
    QuizSubmitRequest, QuizSubmitResponse,
    ContentGenerateRequest, ContentGenerateResponse,
    HistoryResponse, HistoryItem,
    AgentChatRequest, AgentChatResponse
)
from services.quiz_service import generate_quiz, evaluate_quiz
from services.content_service import generate_content, get_history
from services.agent_service import chat as agent_chat
from utils.jwt_handler import decode_access_token
from utils.helpers import sanitize_topic

router = APIRouter()
security = HTTPBearer()


# ── Auth Dependency ──

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Extract and validate user_id from Bearer token."""
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload."
        )
    return user_id


# ══════════════════════════════════════════════
# POST /learning/generate-quiz
# ══════════════════════════════════════════════

@router.post(
    "/generate-quiz",
    response_model=QuizGenerateResponse,
    summary="Generate a diagnostic quiz for a topic"
)
async def generate_quiz_endpoint(
    payload: QuizGenerateRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Generate 10 MCQ questions for the given topic using Gemini AI.

    Requires: Bearer token
    """
    topic = sanitize_topic(payload.topic)

    try:
        result = await generate_quiz(topic)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}"
        )

    return result


# ══════════════════════════════════════════════
# POST /learning/submit-quiz
# ══════════════════════════════════════════════

@router.post(
    "/submit-quiz",
    response_model=QuizSubmitResponse,
    summary="Submit quiz answers for evaluation"
)
async def submit_quiz_endpoint(
    payload: QuizSubmitRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Evaluate quiz answers and return score, level, and per-question breakdown.

    Level classification:
    - 0–4  → Beginner
    - 5–7  → Intermediate
    - 8–10 → Expert

    Requires: Bearer token
    """
    if not payload.questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Questions list cannot be empty."
        )

    topic = sanitize_topic(payload.topic)

    result = evaluate_quiz(
        topic=topic,
        answers=payload.answers,
        questions=payload.questions
    )

    return result


# ══════════════════════════════════════════════
# POST /learning/generate-content
# ══════════════════════════════════════════════

@router.post(
    "/generate-content",
    response_model=ContentGenerateResponse,
    summary="Generate personalized study materials"
)
async def generate_content_endpoint(
    payload: ContentGenerateRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Generate full personalized study materials including:
    - Summary
    - Key concepts
    - Detailed explanation
    - Flashcards
    - Recommendations
    - AI agent intro message

    Also persists the learning session to history.

    Requires: Bearer token
    """
    topic = sanitize_topic(payload.topic)

    try:
        content = await generate_content(
            topic=topic,
            level=payload.level,
            score=payload.score,
            user_id=user_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}"
        )

    return {
        "topic":                    topic,
        "level":                    payload.level,
        "summary":                  content.get("summary", ""),
        "key_concepts":             content.get("key_concepts", []),
        "deep_dive":                content.get("deep_dive", ""),
        "real_world_applications":  content.get("real_world_applications", ""),
        "viva_voice":               content.get("viva_voice", ""),
        "best_practices":           content.get("best_practices", ""),
        "learning_roadmap":         content.get("learning_roadmap", ""),
        "flashcards":               content.get("flashcards", []),
        "recommendations":          content.get("recommendations", {}),
        "agent_intro":              content.get("agent_intro", ""),
    }


# ══════════════════════════════════════════════
# GET /learning/history
# ══════════════════════════════════════════════

@router.get(
    "/history",
    response_model=HistoryResponse,
    summary="Get user's learning history"
)
async def get_history_endpoint(
    user_id: str = Depends(get_current_user_id)
):
    """
    Retrieve the authenticated user's past learning sessions.

    Returns up to 20 most recent sessions, sorted newest first.

    Requires: Bearer token
    """
    try:
        history = get_history(user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch history: {str(e)}"
        )

    return {
        "history": [
            HistoryItem(
                id=str(item["id"]),
                topic=item["topic"],
                score=item["score"],
                level=item["level"],
                created_at=item["created_at"]
            )
            for item in history
        ]
    }


# ══════════════════════════════════════════════
# POST /learning/agent-chat
# ══════════════════════════════════════════════

@router.post(
    "/agent-chat",
    response_model=AgentChatResponse,
    summary="Chat with the AI tutor agent"
)
async def agent_chat_endpoint(
    payload: AgentChatRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Send a message to the proactive AI tutor agent.

    The agent is aware of:
    - The current topic
    - The student's proficiency level
    - The conversation history

    Requires: Bearer token
    """
    try:
        reply = await agent_chat(
            topic=payload.topic,
            level=payload.level,
            message=payload.message,
            history=[{"role": m.role, "content": m.content} for m in payload.history]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}"
        )

    return AgentChatResponse(reply=reply)
