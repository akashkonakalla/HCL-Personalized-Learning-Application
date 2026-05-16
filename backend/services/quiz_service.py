"""
services/quiz_service.py — Quiz generation and evaluation logic
"""

from typing import Any, Dict, List

from services.gemini_service import generate_quiz as gemini_generate_quiz
from utils.helpers import classify_level, safe_int


async def generate_quiz(topic: str) -> Dict[str, Any]:
    """
    Generate a 10-question mixed-format diagnostic quiz for a topic.

    The question set follows a 4-type cognitive distribution (enforced by the prompt):
    - Questions 1–3:  Conceptual  — definitions, principles, core theory
    - Questions 4–6:  Scenario-based — realistic situations requiring applied judgment
    - Questions 7–8:  Analytical  — compare/contrast, trade-off evaluation
    - Questions 9–10: Advanced / edge-case — deep nuance, gotchas, subtle behaviour

    Args:
        topic: The topic string (2-120 characters).

    Returns:
        { topic: str, questions: [{ question, options, correct_answer }] }

    Raises:
        ValueError: If Gemini returns fewer than 5 valid questions.
    """
    questions = await gemini_generate_quiz(topic)
    return {
        "topic":     topic,
        "questions": questions
    }


def evaluate_quiz(
    topic: str,
    answers: Dict[str, int],
    questions: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Evaluate quiz answers and compute score, level, and answer-by-answer breakdown.

    Args:
        topic:     Topic string.
        answers:   Dict mapping question index (str) to selected option index (int).
                   e.g. { "0": 2, "1": 0, ... }
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

        # Get user's selected option index (answers keyed by string index)
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
