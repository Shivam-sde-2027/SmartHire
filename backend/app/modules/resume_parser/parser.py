import json
import re

from google import genai
from google.genai import types

from app.core.config import settings
from app.modules.resume_parser.schemas import Resume
from app.prompts.resume_parser import SYSTEM_INSTRUCTION, build_user_prompt

_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured.")
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def normalize_phone(phone: str | None) -> str | None:
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    return phone


def run_sanity_check(resume: Resume) -> Resume:
    if resume.email and "@" not in resume.email:
        resume.email = None

    resume.phone = normalize_phone(resume.phone)

    if resume.total_experience_years is not None and resume.total_experience_years < 0:
        resume.total_experience_years = 0.0

    cleaned: list[str] = []
    seen: set[str] = set()
    for skill in resume.skills:
        s = skill.strip()
        if not s:
            continue
        lower = s.lower()
        if lower not in seen:
            seen.add(lower)
            cleaned.append(s)
    resume.skills = cleaned
    return resume


def parse_resume(resume_text: str) -> Resume:
    client = get_client()
    prompt = build_user_prompt(resume_text)

    response = client.models.generate_content(
        model=settings.gemini_llm_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=Resume,
            temperature=0.2,
        ),
    )

    raw_json = response.text
    if not raw_json:
        raise RuntimeError("Empty response from resume parser.")

    data = json.loads(raw_json)
    parsed = Resume.model_validate(data)
    return run_sanity_check(parsed)
