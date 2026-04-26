from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import DeclarativeBase, relationship


def utcnow():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    sessions = relationship("Session", back_populates="user")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    input_type = Column(String(10))
    filename = Column(String(500))
    status = Column(String(20), default="pending")
    error_message = Column(String(1000), nullable=True)
    thumbnail = Column(Text, nullable=True)  # base64 JPEG, video sessions only
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="sessions")
    result = relationship(
        "AnalysisResult",
        back_populates="session",
        uselist=False,
        cascade="all, delete-orphan",
    )


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("sessions.id"), unique=True)
    risk_score = Column(Float)
    risk_level = Column(String(20))
    recommendation = Column(String(200))
    num_windows = Column(Integer)
    window_probs = Column(JSON)
    condition_scores = Column(JSON, nullable=True)  # {"parkinsons":0.73,"alzheimers":0.23,...}
    analyzed_at = Column(DateTime, default=utcnow)

    session = relationship("Session", back_populates="result")
