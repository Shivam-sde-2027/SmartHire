import numpy as np
from google import genai

from app.core.config import settings
from app.modules.resume_parser.parser import get_client


def embed_text(text: str) -> np.ndarray:
    client = get_client()
    result = client.models.embed_content(
        model=settings.gemini_embedding_model,
        contents=text,
    )
    values = result.embeddings[0].values
    return np.array(values, dtype=np.float32)
