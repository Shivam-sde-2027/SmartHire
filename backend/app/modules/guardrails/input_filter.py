import json
from google.genai import types
from pydantic import BaseModel, Field

from app.core.config import settings
from app.modules.resume_parser.parser import get_client

class SafetyClassification(BaseModel):
    is_career_related: bool = Field(description="True if the query is related to career, resume, job hunting, interviewing, or salary negotiation.")
    reason: str = Field(description="Brief reason for classification.")

SYSTEM_INSTRUCTION = """
You are a safety filter for an AI Career Mentor.
Classify if the user's prompt is related to professional career development, job search, resume writing, portfolio building, interview preparation, or professional workspace queries.
Non-career queries (e.g. general software coding tasks, cooking, math, creative writing, hacking, history, politics) must be flagged as NOT career related.

You must respond in raw JSON matching the schema.
"""

def is_query_safe_and_on_topic(query: str) -> tuple[bool, str]:
    """Verify if a user query is safe and career-related."""
    # Lightweight heuristic: empty queries
    if not query.strip():
        return False, "Query is empty."
        
    client = get_client()
    try:
        response = client.models.generate_content(
            model=settings.gemini_llm_model,
            contents=f"User Query: '{query}'",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=SafetyClassification,
                temperature=0.0,
            ),
        )
        
        raw_json = response.text
        if not raw_json:
            return False, "Unable to verify topic safety."
            
        data = json.loads(raw_json)
        classification = SafetyClassification.model_validate(data)
        return classification.is_career_related, classification.reason
    except Exception as exc:
        # Fail-safe: if LLM filter fails, allow but log
        print(f"Safety filter warning: {exc}")
        return True, "Safety check bypassed due to error."
