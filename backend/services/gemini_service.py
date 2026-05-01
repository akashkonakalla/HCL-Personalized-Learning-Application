"""
services/gemini_service.py — Google Gemini API integration
All prompt design and AI generation logic lives here.
"""

import google.generativeai as genai
from typing import Any, Dict, List, Optional
import json
import re

from config import settings
from utils.helpers import extract_json_from_text


# ── Configure Gemini ──
genai.configure(api_key=settings.GEMINI_API_KEY)


def _get_model(temperature: float = 0.7) -> genai.GenerativeModel:
    """Get a configured Gemini model instance."""
    return genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        generation_config=genai.GenerationConfig(
            temperature=temperature,
            top_p=0.95,
            top_k=40,
            max_output_tokens=8192,
        )
    )


async def _generate(prompt: str, temperature: float = 0.7) -> str:
    """
    Generate text from Gemini. Returns raw string response.

    Args:
        prompt: Full prompt string.
        temperature: Creativity level (0.0–1.0).

    Returns:
        Generated text string.

    Raises:
        Exception: If Gemini API call fails.
    """
    model = _get_model(temperature)
    response = model.generate_content(prompt)

    if not response.text:
        raise ValueError("Gemini returned an empty response.")

    return response.text


# ══════════════════════════════════════════════
# QUIZ GENERATION
# ══════════════════════════════════════════════

QUIZ_PROMPT = """You are an expert educational assessment designer.

Generate exactly 10 multiple-choice quiz questions to assess a student's knowledge about: "{topic}"

STRICT REQUIREMENTS:
- Each question must test a distinct concept
- Each question must have exactly 4 answer options
- Questions should range from foundational to advanced
- The correct_answer field must be the EXACT TEXT of the correct option (not A/B/C/D)
- Make distractors plausible but clearly wrong to experts

Return ONLY a valid JSON object with no extra text, markdown, or explanation:

{{
  "questions": [
    {{
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A"
    }}
  ]
}}

Topic: {topic}
Generate exactly 10 questions now."""


async def generate_quiz(topic: str) -> List[Dict[str, Any]]:
    """
    Generate 10 MCQ questions for a given topic.

    Args:
        topic: The topic to generate questions about.

    Returns:
        List of question dicts with question, options, correct_answer.

    Raises:
        ValueError: If response cannot be parsed as valid quiz JSON.
    """
    prompt = QUIZ_PROMPT.format(topic=topic)
    raw = await _generate(prompt, temperature=0.6)

    parsed = extract_json_from_text(raw)

    if not parsed or "questions" not in parsed:
        raise ValueError(f"Gemini did not return valid quiz JSON for topic: {topic}")

    questions = parsed["questions"]

    # Validate and clean each question
    validated = []
    for q in questions[:10]:
        if not isinstance(q.get("options"), list) or len(q["options"]) < 4:
            continue
        if not q.get("question") or not q.get("correct_answer"):
            continue
        # Ensure correct_answer is actually one of the options
        if q["correct_answer"] not in q["options"]:
            q["correct_answer"] = q["options"][0]  # fallback
        validated.append({
            "question":       str(q["question"]),
            "options":        [str(o) for o in q["options"][:4]],
            "correct_answer": str(q["correct_answer"])
        })

    if len(validated) < 5:
        raise ValueError("Gemini returned too few valid questions. Please try again.")

    return validated


# ══════════════════════════════════════════════
# CONTENT GENERATION
# ══════════════════════════════════════════════

CONTENT_PROMPT = """You are an expert educational content creator and adaptive learning specialist.

Create comprehensive, personalized study materials for a student with the following profile:
- Topic: {topic}
- Proficiency Level: {level}
- Quiz Score: {score}/10

LEVEL GUIDELINES:
- Beginner (score 0-4): Use simple language, analogies, real-world examples. Avoid jargon. Build intuition first.
- Intermediate (score 5-7): Assume basic familiarity. Introduce technical concepts with clear explanations. Go deeper.
- Expert (score 8-10): Use technical language freely. Focus on nuance, edge cases, advanced applications.

Return ONLY a valid JSON object with no markdown fences or extra text:

{{
  "summary": "A clear 3-4 paragraph overview of {topic} tailored to {level} level. Use markdown formatting (## headers, **bold**, bullet points).",
  
  "key_concepts": [
    {{
      "term": "Concept name",
      "definition": "Clear explanation appropriate for {level} level"
    }}
  ],
  
  "details": "A comprehensive deep-dive explanation (6-8 paragraphs) with markdown formatting. Include examples, applications, and insights appropriate for {level} level.",
  
  "flashcards": [
    {{
      "question": "A testable question about {topic}",
      "answer": "The correct, concise answer"
    }}
  ],
  
  "recommendations": {{
    "weak_areas": ["Area 1 to strengthen", "Area 2"],
    "next_topics": [
      {{
        "title": "Related Topic Name",
        "reason": "Why this topic is relevant next"
      }}
    ],
    "practice_suggestions": ["Practice activity 1", "Practice activity 2", "Practice activity 3"],
    "resources": [
      {{
        "title": "Resource name",
        "description": "Brief description of what this resource covers"
      }}
    ]
  }},
  
  "agent_intro": "A personalized greeting message from the AI tutor acknowledging the student's level and quiz performance, offering specific guidance."
}}

REQUIREMENTS:
- key_concepts: exactly 6-8 concept objects
- flashcards: exactly 8-10 flashcard objects  
- recommendations.next_topics: exactly 3 related topics
- recommendations.practice_suggestions: exactly 3-4 items
- All text must be appropriate for {level} level
- Make content genuinely educational and accurate

Generate the complete JSON now:"""


async def generate_content(topic: str, level: str, score: int) -> Dict[str, Any]:
    """
    Generate full personalized learning content.

    Args:
        topic: Learning topic.
        level: 'Beginner' | 'Intermediate' | 'Expert'
        score: Quiz score 0-10.

    Returns:
        Dict with summary, key_concepts, details, flashcards, recommendations, agent_intro.
    """
    prompt = CONTENT_PROMPT.format(topic=topic, level=level, score=score)
    raw = await _generate(prompt, temperature=0.7)

    parsed = extract_json_from_text(raw)

    if not parsed:
        raise ValueError("Gemini did not return valid content JSON.")

    # Ensure required keys exist with defaults
    defaults = {
        "summary": f"# {topic}\n\nStudy material for {level} level learners.",
        "key_concepts": [],
        "details": f"Detailed explanation of {topic} for {level} learners.",
        "flashcards": [],
        "recommendations": {
            "weak_areas": [],
            "next_topics": [],
            "practice_suggestions": [],
            "resources": []
        },
        "agent_intro": f"Welcome! I'm your AI tutor for {topic}. You're at the {level} level. Ask me anything!"
    }

    for key, default in defaults.items():
        if key not in parsed or not parsed[key]:
            parsed[key] = default

    return parsed


# ══════════════════════════════════════════════
# AGENT CHAT
# ══════════════════════════════════════════════

AGENT_SYSTEM_PROMPT = """You are Personalized Learning AI, an expert, empathetic AI tutor specializing in personalized education.

Current student context:
- Topic being studied: {topic}
- Student's proficiency level: {level}

Your role:
- Answer questions clearly and at the appropriate level for the student
- Identify and address knowledge gaps proactively  
- Suggest concrete next steps and practice strategies
- Use examples and analogies when helpful
- Be encouraging but academically rigorous
- Keep responses focused and actionable (2-4 paragraphs max)
- Use markdown formatting (bold key terms, bullet points for lists)

Do NOT:
- Give excessively long responses
- Go off-topic from {topic} and related subjects
- Be overly formal or robotic

Respond in a warm, mentor-like tone."""


async def chat_with_agent(
    topic: str,
    level: str,
    message: str,
    history: List[Dict[str, str]]
) -> str:
    """
    Generate a contextual AI tutor response.

    Args:
        topic: Current learning topic.
        level: Student's proficiency level.
        message: Latest user message.
        history: List of {role, content} message history.

    Returns:
        AI tutor response string.
    """
    system = AGENT_SYSTEM_PROMPT.format(topic=topic, level=level)

    # Build conversation context
    context_parts = [system, "\n\n--- Conversation History ---"]

    for msg in history[-8:]:  # Last 8 messages for context window efficiency
        role_label = "Student" if msg["role"] == "user" else "Tutor"
        context_parts.append(f"\n{role_label}: {msg['content']}")

    context_parts.append(f"\nStudent: {message}")
    context_parts.append("\nTutor (respond now):")

    full_prompt = "\n".join(context_parts)
    response = await _generate(full_prompt, temperature=0.8)

    # Clean up any role prefixes the model might add
    response = re.sub(r'^(Tutor:|Personalized Learning AI:|Assistant:)\s*', '', response.strip())

    return response
