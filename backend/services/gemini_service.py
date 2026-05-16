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


def _get_model(temperature: float = 0.7, response_mime_type: Optional[str] = None) -> genai.GenerativeModel:
    """Get a configured Gemini model instance."""
    config_args = {
        "temperature": temperature,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 32768,
    }
    if response_mime_type:
        config_args["response_mime_type"] = response_mime_type

    return genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        generation_config=genai.GenerationConfig(**config_args)
    )


async def _generate(prompt: str, temperature: float = 0.7, response_mime_type: Optional[str] = None) -> str:
    """
    Generate text from Gemini. Returns raw string response.

    Args:
        prompt: Full prompt string.
        temperature: Creativity level (0.0–1.0).
        response_mime_type: Expected format (e.g. 'application/json')

    Returns:
        Generated text string.

    Raises:
        Exception: If Gemini API call fails.
    """
    model = _get_model(temperature, response_mime_type)
    response = model.generate_content(prompt)

    if not response.text:
        raise ValueError("Gemini returned an empty response.")

    return response.text


# ══════════════════════════════════════════════
# QUIZ GENERATION
# ══════════════════════════════════════════════

QUIZ_PROMPT = """You are an expert educational assessment designer specializing in adaptive diagnostics.

Generate exactly 10 multiple-choice quiz questions to assess a student's knowledge about: "{topic}"

QUESTION TYPE DISTRIBUTION (strictly follow this):
  - Questions 1–3:  CONCEPTUAL — Test understanding of definitions, principles, and core theory.
                    Example format: "Which of the following BEST describes X?" or "What is the primary purpose of Y?"
  - Questions 4–6:  SCENARIO-BASED — Present a real-world situation and ask what should be done.
                    Example format: "A developer notices X happening. What is the MOST LIKELY cause?" or "Given scenario Y, which approach is correct?"
  - Questions 7–8:  ANALYTICAL — Require comparing, contrasting, or evaluating trade-offs.
                    Example format: "What is the key difference between X and Y?" or "Which implementation is more efficient and why?"
  - Questions 9–10: ADVANCED / EDGE-CASE — Test deep knowledge, gotchas, or subtle nuances.
                    Example format: "What happens when X occurs in situation Y?" or "Which statement about edge case Z is TRUE?"

STRICT REQUIREMENTS:
- Each question must test a DISTINCT concept — no repetition
- Each question must have exactly 4 answer options
- The correct_answer field must be the EXACT TEXT of the correct option (not A/B/C/D)
- Distractors must be plausible but clearly wrong to experts; avoid trick wording
- Scenario questions must describe a concrete, realistic situation (2–3 sentences minimum)
- All questions must be unambiguous and accurate

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
    Generate 10 MCQ questions (conceptual + scenario-based) for a given topic.

    Args:
        topic: The topic to generate questions about.

    Returns:
        List of question dicts with question, options, correct_answer.

    Raises:
        ValueError: If response cannot be parsed as valid quiz JSON.
    """
    prompt = QUIZ_PROMPT.format(topic=topic)
    raw = await _generate(prompt, temperature=0.6, response_mime_type="application/json")

    parsed = extract_json_from_text(raw)

    if isinstance(parsed, list) and len(parsed) > 0 and isinstance(parsed[0], dict):
        parsed = parsed[0]

    if not isinstance(parsed, dict) or "questions" not in parsed:
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
# CONTENT GENERATION  (7-part structure)
# ══════════════════════════════════════════════

CONTENT_PROMPT = """You are a world-class educational content architect and adaptive learning specialist.
Your mission is to produce expert-level, structured study materials personalized to the student below.

STUDENT PROFILE:
  - Topic:            {topic}
  - Proficiency Level: {level}
  - Diagnostic Score:  {score}/10

ADAPTIVE DEPTH RULES — apply these consistently across ALL sections:
  • Beginner  (score 0–4):  Use plain language, rich analogies, step-by-step walkthroughs, and relatable
                             real-world comparisons. Avoid unexplained jargon. Build intuition before theory.
  • Intermediate (score 5–7): Assume foundational familiarity. Introduce technical terminology with clear
                             context. Go deeper into mechanics and design decisions.
  • Expert    (score 8–10): Use precise technical language. Focus on nuance, edge cases, internals,
                             performance trade-offs, and advanced patterns.

OUTPUT FORMAT — return ONLY the following valid JSON object (no markdown fences, no extra text):

{{
  "summary": "A rich 3–5 paragraph executive overview of {topic} calibrated to {level} level. Use markdown (## headings, **bold** terms, inline code `snippets`). Explain what the topic IS, why it matters, and how it fits into the broader landscape. End with what the student will gain from this module.",

  "key_concepts": [
    {{
      "term": "Concept name",
      "definition": "A concise, example-rich explanation appropriate for {level} level. Include: what it is, how it works in practice, and a micro-example (1–2 sentences)."
    }}
  ],

  "deep_dive": "A comprehensive technical deep-dive of {topic} written in markdown. Structure it with ## section headers, ### sub-sections, code blocks (```language ... ```), and bullet lists. Cover: core mechanics, internal working, algorithms or data structures involved, performance characteristics, and a worked example. Minimum 10 distinct sections. Depth must match {level} level.",

  "real_world_applications": "Markdown content showcasing 5–7 concrete real-world use cases of {topic}. For each use case: ## heading with the industry/domain, 2–3 sentences on the problem solved, and a specific example (product, company, or scenario). Include a section on common misconceptions or pitfalls in real-world adoption.",

  "viva_voice": "Markdown content with 8–10 frequently asked viva voice questions about {topic} covering {level} expectations. For each question: ### Q: [question], **Answer:** [detailed answer], **Follow-up:** [one probing follow-up]. Mix conceptual, scenario-based, and system-design questions. Include difficulty tags (🟢 Easy / 🟡 Medium / 🔴 Hard).",

  "best_practices": "Markdown content outlining 6–8 professional best practices for working with {topic}. For each best practice: ## heading, explanation of WHY it matters, a DO / DON'T comparison with short code or pseudo-code examples, and a common pitfall or anti-pattern to avoid.",

  "learning_roadmap": "Markdown content presenting a structured learning roadmap for mastering {topic} beyond this session. Include: ## Phase 1/2/3 sections (Foundation → Intermediate → Advanced), specific sub-topics to study in each phase, recommended progression order, estimated time per phase, and 3–4 curated resource types (books, courses, docs, projects) with brief descriptions. Tailor the entry point to {level} level.",

  "flashcards": [
    {{
      "question": "A testable question probing understanding of {topic}",
      "answer": "The precise, concise correct answer"
    }}
  ],

  "recommendations": {{
    "weak_areas": ["Specific concept or skill to reinforce based on score {score}/10", "Another gap area"],
    "next_topics": [
      {{
        "title": "Related Topic Name",
        "reason": "Why this is the logical next step after {topic}"
      }}
    ],
    "practice_suggestions": ["Concrete activity 1", "Concrete activity 2", "Concrete activity 3", "Concrete activity 4"],
    "resources": [
      {{
        "title": "Resource name",
        "description": "What this resource covers and who it is best suited for"
      }}
    ]
  }},

  "agent_intro": "A warm, personalized 2–3 sentence greeting from the AI tutor. Reference the student's {level} level and their score of {score}/10. Acknowledge strengths, name 1–2 specific areas to work on, and invite the student to ask their first question."
}}

STRICT QUANTITY REQUIREMENTS:
  - key_concepts:                   exactly 6–8 objects
  - flashcards:                     exactly 8–10 objects
  - recommendations.weak_areas:     exactly 2–3 items (inferred from score {score}/10)
  - recommendations.next_topics:    exactly 3 objects
  - recommendations.practice_suggestions: exactly 4 items
  - recommendations.resources:      exactly 3–4 objects
  - All markdown sections must use proper headings, lists, and code blocks where applicable
  - Every section MUST be populated — do NOT leave any field empty or null

Generate the complete, fully-populated JSON now:"""


async def generate_content(topic: str, level: str, score: int) -> Dict[str, Any]:
    """
    Generate full personalized learning content with the 7-part structure.

    Args:
        topic: Learning topic.
        level: 'Beginner' | 'Intermediate' | 'Expert'
        score: Quiz score 0-10.

    Returns:
        Dict matching ContentGenerateResponse schema:
        summary, key_concepts, deep_dive, real_world_applications,
        viva_voice, best_practices, learning_roadmap,
        flashcards, recommendations, agent_intro.
    """
    prompt = CONTENT_PROMPT.format(topic=topic, level=level, score=score)

    # Retry up to 3 times — Gemini occasionally truncates large JSON responses
    last_error = None
    for attempt in range(1, 4):
        try:
            raw = await _generate(prompt, temperature=0.7, response_mime_type="application/json")
            parsed = extract_json_from_text(raw)
            if parsed:
                break
            last_error = f"Attempt {attempt}: extract_json_from_text returned None. Raw length: {len(raw)}"
            print(f"[WARN] Content JSON parse failed — {last_error}")
        except Exception as exc:
            last_error = str(exc)
            print(f"[WARN] Content generation attempt {attempt} raised: {exc}")
            parsed = None
    else:
        raise ValueError(f"Gemini did not return valid content JSON after 3 attempts. Last error: {last_error}")

    if not parsed:
        raise ValueError(f"Gemini did not return valid content JSON. Last error: {last_error}")

    # Ensure parsed is a dictionary. Gemini might sometimes return a list with the object or a string.
    if isinstance(parsed, list):
        parsed = parsed[0] if len(parsed) > 0 and isinstance(parsed[0], dict) else {}
    elif not isinstance(parsed, dict):
        parsed = {}

    # ── Legacy key remapping ─────────────────────────────────────────────────
    # Gemini may return the old `details` key instead of the new `deep_dive`.
    # Map it forward so the defaults sweep doesn't stomp over real content.
    _legacy_map = {
        "details": "deep_dive",
    }
    for old_key, new_key in _legacy_map.items():
        if old_key in parsed and new_key not in parsed:
            val = parsed.pop(old_key)
            if val:  # only migrate if the value is non-empty
                parsed[new_key] = val

    # ── Default values for every required field ──────────────────────────────
    _section_defaults: Dict[str, Any] = {
        "summary": (
            f"## {topic}\n\n"
            f"Welcome to your personalized study guide for **{topic}** at the **{level}** level.\n\n"
            f"This module will help you build a solid understanding of {topic} through structured content."
        ),
        "key_concepts": [],
        "deep_dive": (
            f"## Deep Dive: {topic}\n\n"
            f"A comprehensive exploration of {topic} for {level} learners."
        ),
        "real_world_applications": (
            f"## Real-World Applications of {topic}\n\n"
            f"Explore how {topic} is applied across industries."
        ),
        "viva_voice": (
            f"## Viva Voice: {topic}\n\n"
            f"Common viva voice questions and model answers for {level} level."
        ),
        "best_practices": (
            f"## Best Practices for {topic}\n\n"
            f"Key guidelines and professional patterns when working with {topic}."
        ),
        "learning_roadmap": (
            f"## Learning Roadmap: {topic}\n\n"
            f"A structured path to mastering {topic} beyond this session."
        ),
        "flashcards": [],
        "recommendations": {
            "weak_areas": [],
            "next_topics": [],
            "practice_suggestions": [],
            "resources": []
        },
        "agent_intro": (
            f"Welcome! I'm your AI tutor for **{topic}**. You're at the **{level}** level "
            f"with a score of **{score}/10** on the diagnostic quiz. "
            f"Feel free to ask me anything about {topic}!"
        )
    }

    # Apply defaults only for missing or falsy keys — use explicit field name, not loop var
    for _field, _default in _section_defaults.items():
        if _field not in parsed or parsed[_field] is None or parsed[_field] == "" or parsed[_field] == []:
            parsed[_field] = _default

    # ── Normalise key_concepts: coerce string → list ─────────────────────────
    # FIX: use explicit key name "key_concepts", not a loop variable
    kc = parsed.get("key_concepts")
    if isinstance(kc, str):
        try:
            import json as _json
            parsed_kc = _json.loads(kc)
            if isinstance(parsed_kc, list):
                parsed["key_concepts"] = parsed_kc  # was: parsed[key] — variable shadowing bug
            else:
                parsed["key_concepts"] = [{"term": topic, "definition": kc}]
        except Exception:
            parsed["key_concepts"] = [{"term": topic, "definition": kc}]

    # ── Normalise recommendations sub-keys ───────────────────────────────────
    rec = parsed.get("recommendations")
    _rec_default = {
        "weak_areas": [],
        "next_topics": [],
        "practice_suggestions": [],
        "resources": []
    }
    if not isinstance(rec, dict):
        parsed["recommendations"] = _rec_default
    else:
        for sub_key, sub_default in _rec_default.items():
            if sub_key not in rec or rec[sub_key] is None:
                rec[sub_key] = sub_default

    return parsed


# ══════════════════════════════════════════════
# AGENT CHAT
# ══════════════════════════════════════════════

AGENT_SYSTEM_PROMPT = """You are LearnMate, an elite AI learning coach and subject-matter expert.
Your personality is warm, encouraging, intellectually sharp, and deeply student-focused.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Current topic:        {topic}
  • Proficiency level:    {level}
  • Quiz score:           {score}/10

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR TEACHING APPROACH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. CALIBRATE to the student's level:
       - Beginner:     Use simple language, analogies, step-by-step breakdowns. Never assume prior knowledge.
       - Intermediate: Balance clarity with depth. Introduce technical terms with brief explanations.
       - Expert:       Engage as a peer. Use precise terminology, explore nuance, discuss trade-offs.

  2. STRUCTURE every response for scannability:
       - Lead with the direct answer in 1–2 sentences.
       - Use **bold** for key terms, `inline code` for syntax, bullet points for lists.
       - Add a short code block if it clarifies a concept faster than prose.
       - Close with ONE actionable next step or follow-up question to deepen engagement.

  3. DIAGNOSE gaps proactively:
       - If the student's question reveals a misconception, gently correct it first.
       - Connect new questions back to {topic} fundamentals where relevant.
       - If a question is outside {topic}, briefly answer but redirect focus.

  4. KEEP responses focused and concise (3–5 short paragraphs or equivalent bullet structure).
     Never write walls of text. Quality > quantity.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TONE GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ DO:  Be encouraging, precise, intellectually curious.
  ✅ DO:  Celebrate progress ("Great question!", "You're thinking exactly right here!")
  ✅ DO:  Use real-world analogies and concrete examples.
  ❌ DON'T: Be robotic, overly formal, or condescending.
  ❌ DON'T: Give vague non-answers or hedge excessively.
  ❌ DON'T: Write more than necessary — brevity is a virtue.

Respond now as LearnMate."""


async def chat_with_agent(
    topic: str,
    level: str,
    message: str,
    history: List[Dict[str, str]],
    score: int = 0
) -> str:
    """
    Generate a contextual, personalized AI tutor response.

    Args:
        topic:   Current learning topic.
        level:   Student's proficiency level.
        message: Latest user message.
        history: List of {role, content} message history.
        score:   Student's quiz score (default 0 for backward-compat).

    Returns:
        AI tutor response string.
    """
    system = AGENT_SYSTEM_PROMPT.format(topic=topic, level=level, score=score)

    # Build conversation context
    context_parts = [system, "\n\n━━━ Conversation History ━━━"]

    for msg in history[-8:]:  # Last 8 messages for context window efficiency
        role_label = "Student" if msg["role"] == "user" else "LearnMate"
        context_parts.append(f"\n{role_label}: {msg['content']}")

    context_parts.append(f"\nStudent: {message}")
    context_parts.append("\nLearnMate (respond now):")

    full_prompt = "\n".join(context_parts)
    response = await _generate(full_prompt, temperature=0.75)

    # Clean up any role prefixes the model might add
    response = re.sub(
        r'^(LearnMate:|Tutor:|Personalized Learning AI:|Assistant:)\s*',
        '',
        response.strip()
    )

    return response