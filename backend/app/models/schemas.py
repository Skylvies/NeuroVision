from datetime import datetime
from pydantic import BaseModel


class SessionResponse(BaseModel):
    id: str
    input_type: str
    filename: str
    status: str
    error_message: str | None = None
    created_at: datetime
    thumbnail: str | None = None
    user_id: str | None = None

    model_config = {"from_attributes": True}


class AnalysisResultResponse(BaseModel):
    session_id: str
    risk_score: float
    risk_level: str
    recommendation: str
    num_windows: int
    window_probs: list[float]
    condition_scores: dict[str, float] | None = None
    analyzed_at: datetime

    model_config = {"from_attributes": True}


class SessionDetailResponse(BaseModel):
    session: SessionResponse
    result: AnalysisResultResponse | None = None

    model_config = {"from_attributes": True}


class AnalysisProgress(BaseModel):
    type: str = "log"  # "log" | "windows" | "result" | "error"
    stage: str
    progress: float
    message: str
    # type="windows" payload
    window_count: int | None = None
    # type="result" payload
    risk_score: float | None = None
    risk_level: str | None = None
    recommendation: str | None = None
    window_probs: list[float] | None = None
