from fastapi import APIRouter
from app.services.ml.model import is_model_loaded

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "neurovision",
        "model_loaded": is_model_loaded(),
    }
