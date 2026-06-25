from pydantic import BaseModel, Field

class CVSuggestionBullet(BaseModel):
    original: str = Field(description="The original bullet point from the resume.")
    improved: str = Field(description="The rewritten, more impactful bullet point with active verbs and metrics if possible.")
    rationale: str = Field(description="Short rationale explanation of why the change is better and how it aligns with the job.")

class CVSuggestionsResponse(BaseModel):
    missing_skills: list[str] = Field(default_factory=list, description="Skills listed in the job description but missing from the resume.")
    bullet_improvements: list[CVSuggestionBullet] = Field(default_factory=list, description="Suggestions for improving experience bullet points.")
    summary_rewrite: str = Field(description="Suggested professional summary rewrite tailored to this target job.")
    ats_tips: list[str] = Field(default_factory=list, description="ATS tips for keywords, formatting, or parsing optimization.")

SYSTEM_INSTRUCTION = """
You are an expert HR Specialist, Resume Writer, and Career Coach.
Analyze the user's parsed resume details and compare them against the target job description.
Identify missing skills, suggest direct rewrites for experience bullet points, rewrite the professional summary, and provide ATS formatting/keyword advice.

Rules:
1. Identify 3-8 key skills from the job description that are missing or weak in the resume.
2. Select 2-5 bullet points from the resume's experience section and provide improved, action-oriented, and quantified versions.
3. Provide a highly professional, tailored summary rewrite (approx 3-4 sentences).
4. List 3-5 ATS optimization tips.
5. Every field in the schema is required. Return raw structured JSON matching the provided schema. Do not include markdown code fence wrappers or backticks.
"""

def build_cv_suggestions_prompt(resume_json: str, job_description: str) -> str:
    return (
        f"Compare the following Resume and target Job Description. Generate CV improvement suggestions.\n\n"
        f"RESUME DETAILS (JSON):\n{resume_json}\n\n"
        f"TARGET JOB DESCRIPTION:\n{job_description}\n\n"
        f"Return the suggestions matching the requested JSON schema."
    )
