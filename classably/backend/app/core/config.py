from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --------------------------------------------------
    # Application
    # --------------------------------------------------
    APP_NAME: str = "ClassAbly"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"

    DEBUG: bool = True

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # --------------------------------------------------
    # Database
    # --------------------------------------------------
    DATABASE_URL: str = "sqlite:///./classably.db"

    # --------------------------------------------------
    # Authentication
    # --------------------------------------------------
    SECRET_KEY: str = "default-production-secret-key-classably-accessibility-2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # --------------------------------------------------
    # Redis
    # --------------------------------------------------
    REDIS_URL: str = "redis://localhost:6379/0"

    # --------------------------------------------------
    # Logging
    # --------------------------------------------------
    LOG_LEVEL: str = "INFO"

    # --------------------------------------------------
    # File Uploads & CORS
    # --------------------------------------------------
    UPLOAD_DIR: str = "uploads"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:3000"

    # --------------------------------------------------
    # AI / Gemini
    # --------------------------------------------------
    GEMINI_API_KEY: str = ""

    # --------------------------------------------------
    # Email / Gmail SMTP & OTP
    # --------------------------------------------------
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "ClassAbly"
    OTP_EXPIRE_MINUTES: int = 5
    OTP_COOLDOWN_SECONDS: int = 60
    MOCK_EMAIL_IN_DEV: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()