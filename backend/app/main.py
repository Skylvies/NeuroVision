"""
NeuroVision FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import init_db
from app.services.ml.model import load_model

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database...")
    await init_db()
    logger.info("Loading NeuroVision model...")
    loaded = load_model(settings.MODEL_PATH)
    if loaded:
        logger.info(f"Model loaded from {settings.MODEL_PATH}")
    else:
        logger.warning(
            f"Model not found at {settings.MODEL_PATH}. "
            "Inference will use fallback. Run training first."
        )
    yield
    # Shutdown
    logger.info("Shutting down NeuroVision backend.")


app = FastAPI(
    title="NeuroVision API",
    description="Parkinson's Disease screening via oculomotor analysis",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.api.routes.health import router as health_router
from app.api.routes.analysis import router as analysis_router, _ws_connections
from app.api.routes.auth import router as auth_router

app.include_router(health_router)
app.include_router(analysis_router)
app.include_router(auth_router)


@app.websocket("/ws/analysis/{session_id}")
async def websocket_analysis_progress(websocket: WebSocket, session_id: str):
    """Real-time progress updates for an analysis session."""
    await websocket.accept()
    _ws_connections.setdefault(session_id, []).append(websocket)
    logger.info(f"WebSocket connected for session {session_id}")

    try:
        while True:
            # Keep connection alive; client can send pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        connections = _ws_connections.get(session_id, [])
        if websocket in connections:
            connections.remove(websocket)
        if not connections:
            _ws_connections.pop(session_id, None)
        logger.info(f"WebSocket disconnected for session {session_id}")
