from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./neurovision.db"
    MODEL_PATH: str = "ml/models/neurovision_bilstm.pt"
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:18501",
    ]
    MAX_UPLOAD_MB: int = 200
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    JWT_EXPIRE_DAYS: int = 7

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
