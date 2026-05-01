"""
services/quiz_service.py — Quiz generation and evaluation logic
"""

from typing import Any, Dict, List

from services.gemini_service import generate_quiz as gemini_generate_quiz
from utils.helpers import classify_level, safe_int


async def generate_quiz(topic: str) -> Dict[str, Any]:
    """
    Generate a 10-question diagnostic quiz for a topic.

    Args:
        topic: Topic string.

    Returns:
        { topic, questions: [{ question, options, correct_answer }] }
    """
    questions = await gemini_generate_quiz(topic)
    return {
        "topic": topic,
        "questions": questions
    }


def evaluate_quiz(
    topic: str,
    answers: Dict[str, int],
    questions: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Evaluate quiz answers and compute score, level, and breakdown.

    Args:
        topic: Topic string.
        answers: Dict mapping question index (str) to selected option index (int).
        questions: Full question list with correct_answer fields.

    Returns:
        {
            topic, score, total, level,
            breakdown: [{ question, user_answer, correct_answer, correct }]
        }
    """
    score = 0
    breakdown = []

    for idx, question in enumerate(questions):
        q_text         = question.get("question", "")
        options        = question.get("options", [])
        correct_answer = question.get("correct_answer", "")

        # Get user's selected option index
        selected_idx = answers.get(str(idx))
        user_answer  = None

        if selected_idx is not None:
            opt_idx = safe_int(selected_idx, -1)
            if 0 <= opt_idx < len(options):
                user_answer = options[opt_idx]

        is_correct = (user_answer == correct_answer)
        if is_correct:
            score += 1

        breakdown.append({
            "question":       q_text,
            "user_answer":    user_answer,
            "correct_answer": correct_answer,
            "correct":        is_correct
        })

    level = classify_level(score)

    return {
        "topic":     topic,
        "score":     score,
        "total":     len(questions),
        "level":     level,
        "breakdown": breakdown
    }
