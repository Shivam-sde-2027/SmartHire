import json
from google.genai import types

from app.core.config import settings
from app.modules.resume_parser.parser import get_client
from app.modules.resume_parser.schemas import Resume
from app.prompts.cv_suggestions import (
    CVSuggestionsResponse,
    SYSTEM_INSTRUCTION,
    build_cv_suggestions_prompt,
)

def generate_cv_suggestions(resume: Resume, job_description: str) -> CVSuggestionsResponse:
    """Compare resume and job description to generate improvement suggestions."""
    client = get_client()
    
    # Convert resume to JSON string for the prompt context
    resume_dict = resume.model_dump()
    resume_json = json.dumps(resume_dict, indent=2)
    
    prompt = build_cv_suggestions_prompt(resume_json, job_description)
    
    response = client.models.generate_content(
        model=settings.gemini_llm_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=CVSuggestionsResponse,
            temperature=0.3,
        ),
    )
    
    raw_json = response.text
    if not raw_json:
        raise RuntimeError("Empty response from CV Suggestions generator.")
        
    data = json.loads(raw_json)
    return CVSuggestionsResponse.model_validate(data)
