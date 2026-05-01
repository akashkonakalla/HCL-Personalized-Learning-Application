"""
schemas/learning_schema.py — Pydantic models for learning endpoints
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


# ─── Quiz ───

class QuizGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=120, description="Topic to generate quiz for")


class QuizQuestion(BaseModel):
    question: str
    options: List[str] = Field(..., min_length=4, max_length=4)
    correct_answer: str


class QuizGenerateResponse(BaseModel):
    topic: str
    questions: List[QuizQuestion]


class QuizSubmitRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=120)
    answers: Dict[str, int]          # { "0": 2, "1": 0, ... } — question_index: option_index
    questions: List[Dict[str, Any]]  # Full question objects with correct_answer


class BreakdownItem(BaseModel):
    question: str
    user_answer: Optional[str]
    correct_answer: str
    correct: bool


class QuizSubmitResponse(BaseModel):
    topic: str
    score: int
    total: int
    level: str
    breakdown: List[BreakdownItem]


# ─── Content ───

class ContentGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=120)
    level: str = Field(..., pattern="^(Beginner|Intermediate|Expert)$")
    score: int = Field(..., ge=0, le=10)


class Flashcard(BaseModel):
    question: str
    answer: str


class Recommendations(BaseModel):
    weak_areas: List[str] = []
    next_topics: List[Any] = []
    practice_suggestions: List[str] = []
    resources: List[Any] = []


class ContentGenerateResponse(BaseModel):
    topic: str
    level: str
    summary: str
    key_concepts: Any          # String or list of concept objects
    details: str
    flashcards: List[Flashcard]
    recommendations: Recommendations
    agent_intro: Optional[str] = None


# ─── History ───

class HistoryItem(BaseModel):
    id: str
    topic: str
    score: int
    level: str
    created_at: str


class HistoryResponse(BaseModel):
    history: List[HistoryItem]


# ─── Agent Chat ───

class AgentChatMessage(BaseModel):
    role: str   # 'user' | 'assistant'
    content: str


class AgentChatRequest(BaseModel):
    topic: str
    level: str
    message: str = Field(..., min_length=1, max_length=1000)
    history: List[AgentChatMessage] = []


class AgentChatResponse(BaseModel):
    reply: str
