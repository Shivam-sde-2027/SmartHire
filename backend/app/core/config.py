from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_ROOT.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    gemini_api_key: str = ""
    gemini_llm_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "gemini-embedding-001"

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    auth_enabled: bool = False

    database_url: str = ""
    cors_origins: str = "http://localhost:5173"
    upload_max_mb: int = 10

    job_faiss_index_path: str = "../data/indexes/job_faiss.index"
    job_metadata_path: str = "../data/indexes/job_metadata.pkl"
    career_notes_faiss_index_path: str = "../data/indexes/career_notes_faiss.index"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def resolve_path(self, relative: str) -> Path:
        path = Path(relative)
        if path.is_absolute():
            return path
        return (BACKEND_ROOT / path).resolve()

    @property
    def job_index_path(self) -> Path:
        return self.resolve_path(self.job_faiss_index_path)

    @property
    def job_meta_path(self) -> Path:
        return self.resolve_path(self.job_metadata_path)

    @property
    def upload_max_bytes(self) -> int:
        return self.upload_max_mb * 1024 * 1024



@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
