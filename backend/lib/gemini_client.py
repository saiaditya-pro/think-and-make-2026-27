"""
Wraps the Gemini call InquiBuddy needs: given a team's idea-sheet photo (and
optional audio of their pitch), produce 4-5 bilingual (English + Telugu)
reflection questions -- see docs/InquiBuddy_School_Panel_User_Flow_Manual.pdf
for the exact output shape this feeds into (feedback_reports PDF).
"""

import json

from django.conf import settings
from google import genai
from google.genai import types

MODEL = "gemini-2.5-flash"

PROMPT = """You are helping evaluate a school student team's innovation idea
for the Think & Make program (grades 6-8, India). You are given a photo of
their idea sheet{audio_clause}.

Write exactly 5 short reflection questions in English that a facilitator can
ask the team to help them think more deeply about their idea (problem it
solves, how it differs from existing solutions, materials/resources needed,
how they'd test it, and challenges they might face). Then translate each
question into natural, simple Telugu suitable for a middle-school student.

Respond with ONLY a JSON array of exactly 5 objects, no markdown fences:
[{{"question_en": "...", "question_te": "..."}}, ...]
"""


def _client() -> genai.Client:
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def generate_feedback_questions(*, photo_bytes: bytes, photo_mime: str, audio_bytes: bytes | None = None,
                                 audio_mime: str | None = None) -> list[dict]:
    """Returns a list of up to 5 {"question_en", "question_te"} dicts."""
    parts = [types.Part.from_bytes(data=photo_bytes, mime_type=photo_mime)]
    audio_clause = ""
    if audio_bytes:
        parts.append(types.Part.from_bytes(data=audio_bytes, mime_type=audio_mime or "audio/mp4"))
        audio_clause = " and an audio recording of the team pitching their idea"

    parts.append(types.Part.from_text(text=PROMPT.format(audio_clause=audio_clause)))

    response = _client().models.generate_content(
        model=MODEL,
        contents=[types.Content(role="user", parts=parts)],
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    questions = json.loads(response.text)
    return questions[:5]
