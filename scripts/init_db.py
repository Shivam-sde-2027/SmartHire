import asyncio
import sys
from pathlib import Path

# Add backend folder to path so we can import app modules
sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.config import settings
from app.models.models import Base
from sqlalchemy.ext.asyncio import create_async_engine

async def init_models():
    database_url = settings.database_url
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
    print(f"Connecting to database to initialize tables...")
    engine = create_async_engine(database_url, echo=True)
    
    async with engine.begin() as conn:
        print("Creating all tables in database...")
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created successfully!")
        
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_models())
