import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class DBJob(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True) # Matches FAISS index row
    job_id = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    experience_level = Column(String, nullable=True)
    years_of_experience = Column(String, nullable=True)
    skills = Column(Text, nullable=True)
    responsibilities = Column(Text, nullable=True)
    keywords = Column(Text, nullable=True)
    search_text = Column(Text, nullable=True)
    faiss_index = Column(Integer, nullable=True)

class DBResume(Base):
    __tablename__ = "resumes"
    
    id = Column(String, primary_key=True, index=True) # UUID or standard identifier
    user_id = Column(String, index=True, nullable=False)
    file_path = Column(String, nullable=True)
    raw_text_hash = Column(String, nullable=True)
    parsed_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

class DBJobMatch(Base):
    __tablename__ = "job_matches"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    resume_id = Column(String, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    results = Column(JSON, nullable=False) # stores list of matches
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

class DBCVSuggestion(Base):
    __tablename__ = "cv_suggestions"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    resume_id = Column(String, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String, nullable=True) # Can be DB job_id or None if custom text is analyzed
    suggestions = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

class DBChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    messages = relationship("DBChatMessage", back_populates="session", cascade="all, delete-orphan")

class DBChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False) # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    citations = Column(JSON, nullable=True) # List of source citations
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    session = relationship("DBChatSession", back_populates="messages")

class DBCareerNote(Base):
    __tablename__ = "career_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    source_path = Column(String, nullable=False)
    chunk_index = Column(Integer, nullable=False)
