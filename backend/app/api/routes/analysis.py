"""
Analysis API routes: file upload endpoints, session management, WebSocket progress.
"""

import asyncio
import logging
import os
import tempfile
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.routes.auth import get_optional_user
from app.db.session import get_db
from app.models.database import AnalysisResult, Session, User
from app.models.schemas import SessionDetailResponse, SessionResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analysis"])

# WebSocket connections registry: session_id → list of active WebSocket connections
_ws_connections: dict[str, list[WebSocket]] = {}

ALLOWED_DATA_EXTENSIONS = {".txt", ".csv", ".tsv"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}


async def _send_progress(session_id: str, **data):
    """Broadcast a progress JSON payload to all WebSocket subscribers."""
    connections = _ws_connections.get(session_id, [])
    dead = []
    for ws in connections:
        try:
            await ws.send_json(data)
        except Exception:
            dead.append(ws)
    for ws in dead:
        connections.remove(ws)


# ─────────────────────────────────────────────────────────────────────────────
# Background pipeline: eye-tracking data file
# ─────────────────────────────────────────────────────────────────────────────

async def _run_data_analysis(session_id: str, file_path: str):
    """Full analysis pipeline for uploaded eye-tracking data files."""
    from app.db.session import AsyncSessionLocal
    from app.models.database import Session, AnalysisResult
    from app.services.ml.inference import (
        parse_eye_tracking_file,
        normalize,
        sliding_windows,
        run_inference_batch,
        stratify_risk,
        compute_condition_scores,
    )

    async def update_status(status: str, error: str | None = None):
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Session).where(Session.id == session_id))
            session = result.scalar_one_or_none()
            if session:
                session.status = status
                if error:
                    session.error_message = error
                await db.commit()

    try:
        # Stage 1: Parse file
        await _send_progress(
            session_id, type="log", stage="parse", progress=5,
            message="Parsing eye-tracking data file..."
        )
        values = await asyncio.to_thread(parse_eye_tracking_file, file_path)
        await _send_progress(
            session_id, type="log", stage="parse", progress=15,
            message=f"Loaded {len(values):,} gaze frames."
        )

        # Stage 2: Normalize
        await _send_progress(
            session_id, type="log", stage="normalize", progress=20,
            message="Normalizing gaze coordinates to [0, 1]..."
        )
        values_norm = await asyncio.to_thread(normalize, values)
        await _send_progress(
            session_id, type="log", stage="normalize", progress=28,
            message="Normalization complete."
        )

        # Stage 3: Sliding windows
        await _send_progress(
            session_id, type="log", stage="windows", progress=32,
            message="Building sliding windows (size=300, stride=100)..."
        )
        windows = await asyncio.to_thread(sliding_windows, values_norm)
        n_windows = len(windows)
        await _send_progress(
            session_id, type="windows", stage="windows", progress=40,
            message=f"Created {n_windows} temporal windows.",
            window_count=n_windows,
        )

        # Stage 4: BiLSTM inference — streamed in batches
        await _send_progress(
            session_id, type="log", stage="inference", progress=50,
            message=f"Running BiLSTM inference on {n_windows} windows..."
        )
        BATCH = max(1, min(10, n_windows // 6 or 1))
        all_probs: list[float] = []
        for start in range(0, n_windows, BATCH):
            batch = windows[start : start + BATCH]
            batch_probs = await asyncio.to_thread(run_inference_batch, batch)
            all_probs.extend(batch_probs)
            inf_progress = 50 + (len(all_probs) / n_windows) * 28
            await _send_progress(
                session_id,
                type="inference_update",
                stage="inference",
                progress=round(inf_progress, 1),
                message=f"Processed {len(all_probs)}/{n_windows} windows...",
                partial_window_probs=all_probs[:],
            )
        import numpy as np
        risk_score = float(np.mean(all_probs))
        window_probs = all_probs
        await _send_progress(
            session_id, type="log", stage="inference", progress=78,
            message=f"Inference complete. Risk score: {risk_score:.3f}"
        )

        # Stage 5: Risk stratification + condition scores
        await _send_progress(
            session_id, type="log", stage="aggregate", progress=82,
            message="Computing risk stratification..."
        )
        risk_level, recommendation = stratify_risk(risk_score)
        condition_scores = await asyncio.to_thread(compute_condition_scores, windows, all_probs)
        await _send_progress(
            session_id, type="result", stage="aggregate", progress=88,
            message=f"Risk level: {risk_level}",
            risk_score=risk_score,
            risk_level=risk_level,
            recommendation=recommendation,
            window_probs=window_probs,
            condition_scores=condition_scores,
        )

        # Stage 6: Save to DB
        await _send_progress(
            session_id, type="log", stage="saving", progress=92,
            message="Saving analysis results..."
        )
        async with AsyncSessionLocal() as db:
            session_obj = await db.get(Session, session_id)
            if session_obj:
                analysis = AnalysisResult(
                    session_id=session_id,
                    risk_score=risk_score,
                    risk_level=risk_level,
                    recommendation=recommendation,
                    num_windows=n_windows,
                    window_probs=window_probs,
                    condition_scores=condition_scores,
                    analyzed_at=datetime.now(timezone.utc),
                )
                session_obj.status = "complete"
                db.add(analysis)
                await db.commit()

        await _send_progress(
            session_id, type="log", stage="complete", progress=100,
            message="Analysis complete!"
        )

    except Exception as e:
        logger.error(f"Analysis failed for session {session_id}: {e}", exc_info=True)
        await update_status("error", str(e))
        await _send_progress(
            session_id, type="error", stage="error", progress=0,
            message=f"Analysis failed: {str(e)}"
        )
    finally:
        # Clean up temp file
        try:
            os.unlink(file_path)
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Background pipeline: video file
# ─────────────────────────────────────────────────────────────────────────────

async def _run_video_analysis(session_id: str, file_path: str):
    """Full analysis pipeline for uploaded video files."""
    from app.db.session import AsyncSessionLocal
    from app.models.database import Session, AnalysisResult
    from app.services.ml.video import extract_gaze_from_video, prepare_video_windows, extract_thumbnail
    from app.services.ml.inference import run_inference_batch, stratify_risk, normalize, compute_condition_scores
    import numpy as np

    async def update_status(status: str, error: str | None = None):
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Session).where(Session.id == session_id))
            session = result.scalar_one_or_none()
            if session:
                session.status = status
                if error:
                    session.error_message = error
                await db.commit()

    try:
        # Extract thumbnail before heavy processing
        await _send_progress(session_id, type="log", stage="parse", progress=2,
                             message="Extracting video preview...")
        thumb = await asyncio.to_thread(extract_thumbnail, file_path)
        if thumb:
            async with AsyncSessionLocal() as db:
                _s = await db.get(Session, session_id)
                if _s:
                    _s.thumbnail = thumb
                    await db.commit()

        # Stage 1: Open video
        await _send_progress(
            session_id, type="log", stage="parse", progress=5,
            message="Opening video file..."
        )

        # Stage 2: MediaPipe gaze extraction
        await _send_progress(
            session_id, type="log", stage="parse", progress=10,
            message="Extracting iris landmarks with MediaPipe FaceLandmarker..."
        )
        gaze = await asyncio.to_thread(extract_gaze_from_video, file_path)
        await _send_progress(
            session_id, type="log", stage="parse", progress=38,
            message=f"Extracted {len(gaze):,} gaze frames from video."
        )

        # Stage 2b: Normalize gaze to [0, 1]
        # (mirrors the data-file pipeline; gaze-offset features span ≈ [-0.5, 0.5])
        await _send_progress(
            session_id, type="log", stage="normalize", progress=40,
            message="Normalizing gaze coordinates..."
        )
        gaze = await asyncio.to_thread(normalize, gaze)

        # Stage 3: Build windows
        await _send_progress(
            session_id, type="log", stage="windows", progress=42,
            message="Building gaze windows..."
        )
        windows = await asyncio.to_thread(prepare_video_windows, gaze)
        n_windows = len(windows)
        await _send_progress(
            session_id, type="windows", stage="windows", progress=50,
            message=f"Created {n_windows} temporal windows.",
            window_count=n_windows,
        )

        # Stage 4: BiLSTM inference — streamed in batches
        await _send_progress(
            session_id, type="log", stage="inference", progress=55,
            message=f"Running BiLSTM inference on {n_windows} windows..."
        )
        BATCH = max(1, min(10, n_windows // 6 or 1))
        all_probs: list[float] = []
        for start in range(0, n_windows, BATCH):
            batch = windows[start : start + BATCH]
            batch_probs = await asyncio.to_thread(run_inference_batch, batch)
            all_probs.extend(batch_probs)
            inf_progress = 55 + (len(all_probs) / n_windows) * 25
            await _send_progress(
                session_id,
                type="inference_update",
                stage="inference",
                progress=round(inf_progress, 1),
                message=f"Processed {len(all_probs)}/{n_windows} windows...",
                partial_window_probs=all_probs[:],
            )
        risk_score = float(np.mean(all_probs))
        window_probs = all_probs
        await _send_progress(
            session_id, type="log", stage="inference", progress=80,
            message=f"Inference complete. Risk score: {risk_score:.3f}"
        )

        # Stage 5: Risk stratification + condition scores
        await _send_progress(
            session_id, type="log", stage="aggregate", progress=85,
            message="Computing risk stratification..."
        )
        risk_level, recommendation = stratify_risk(risk_score)
        condition_scores = await asyncio.to_thread(compute_condition_scores, windows, all_probs)
        await _send_progress(
            session_id, type="result", stage="aggregate", progress=90,
            message=f"Risk level: {risk_level}",
            risk_score=risk_score,
            risk_level=risk_level,
            recommendation=recommendation,
            window_probs=window_probs,
            condition_scores=condition_scores,
        )

        # Stage 6: Save
        await _send_progress(
            session_id, type="log", stage="saving", progress=94,
            message="Saving analysis results..."
        )
        async with AsyncSessionLocal() as db:
            session_obj = await db.get(Session, session_id)
            if session_obj:
                analysis = AnalysisResult(
                    session_id=session_id,
                    risk_score=risk_score,
                    risk_level=risk_level,
                    recommendation=recommendation,
                    num_windows=n_windows,
                    window_probs=window_probs,
                    condition_scores=condition_scores,
                    analyzed_at=datetime.now(timezone.utc),
                )
                session_obj.status = "complete"
                db.add(analysis)
                await db.commit()

        await _send_progress(
            session_id, type="log", stage="complete", progress=100,
            message="Analysis complete!"
        )

    except Exception as e:
        logger.error(f"Video analysis failed for session {session_id}: {e}", exc_info=True)
        await update_status("error", str(e))
        await _send_progress(
            session_id, type="error", stage="error", progress=0,
            message=f"Analysis failed: {str(e)}"
        )
    finally:
        try:
            os.unlink(file_path)
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# REST Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/analyze/data", response_model=SessionResponse)
async def analyze_data_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Upload an eye-tracking data file (.txt or .csv) for analysis."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_DATA_EXTENSIONS:
        raise HTTPException(
            400,
            f"Invalid file type '{ext}'. Allowed: {ALLOWED_DATA_EXTENSIONS}"
        )

    session_id = str(uuid.uuid4())

    # Save file to temp path
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    # Create session record
    session = Session(
        id=session_id,
        input_type="data",
        filename=file.filename or "upload.txt",
        status="processing",
        user_id=current_user.id if current_user else None,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Fire background task
    asyncio.create_task(_run_data_analysis(session_id, tmp_path))

    return session


@router.post("/analyze/video", response_model=SessionResponse)
async def analyze_video_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Upload a video file (.mp4, .avi, .mov) for eye-movement analysis."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            400,
            f"Invalid file type '{ext}'. Allowed: {ALLOWED_VIDEO_EXTENSIONS}"
        )

    session_id = str(uuid.uuid4())

    # Save file to temp path
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    # Create session record
    session = Session(
        id=session_id,
        input_type="video",
        filename=file.filename or "upload.mp4",
        status="processing",
        user_id=current_user.id if current_user else None,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Fire background task
    asyncio.create_task(_run_video_analysis(session_id, tmp_path))

    return session


@router.get("/sessions", response_model=list[SessionDetailResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
    current_user: User | None = Depends(get_optional_user),
):
    """List recent analysis sessions with their results."""
    query = (
        select(Session)
        .options(selectinload(Session.result))
        .order_by(Session.created_at.desc())
        .limit(limit)
    )
    if current_user:
        query = query.where(Session.user_id == current_user.id)
    else:
        query = query.where(Session.user_id.is_(None))

    result = await db.execute(query)
    sessions = result.scalars().all()

    return [
        SessionDetailResponse(
            session=s,
            result=s.result,
        )
        for s in sessions
    ]


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a session and its analysis result by ID."""
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.result))
        .where(Session.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(404, f"Session {session_id} not found")

    return SessionDetailResponse(
        session=session,
        result=session.result,
    )
