from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-key-change-in-production-must-be-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    DATABASE_URL: str = "sqlite:///./spr_hub.db"

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "SPR Weekly Hub"
    SMTP_FROM_EMAIL: str = ""

    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 10

    ADMIN_EMAIL: str = "admin@spr.com"
    ADMIN_PASSWORD: str = "Admin@SPR2024!"
    ADMIN_USERNAME: str = "Admin"

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
