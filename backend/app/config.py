"""
Configuration settings for WindOps Pro Backend
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, Union, List
import os
from pathlib import Path


class Settings(BaseSettings):
    """Application settings"""
    
    # App Info
    APP_NAME: str = "WindOps Pro API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production-minimum-32-characters-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v
    
    # Paths
    BASE_DIR: Path = Path(__file__).parent  # backend/app/
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOADS_DIR: Path = DATA_DIR / "uploads"
    JOBS_DIR: Path = DATA_DIR / "jobs"
    RESULTS_DIR: Path = DATA_DIR / "results"
    STATIC_DATA_DIR: Path = DATA_DIR / "static_data"
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100 MB
    ALLOWED_EXTENSIONS: set = {".csv", ".parquet"}
    
    # OpenOA Settings
    OPENOA_CONFIDENCE_LEVEL: float = 0.95
    OPENOA_NUM_SIM: int = 10000  # Monte Carlo simulations
    OPENOA_ENABLE_REAL_ANALYSIS: bool = False  # Set to True when OpenOA is installed
    
    # Background Jobs
    JOB_POLL_INTERVAL: int = 5  # seconds
    JOB_TIMEOUT: int = 3600  # 1 hour max
    
    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    
    class Config:
        env_file = str(Path(__file__).parent.parent / ".env")  # backend/.env
        case_sensitive = True


# Create settings instance
settings = Settings()

# Ensure directories exist
settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
settings.JOBS_DIR.mkdir(parents=True, exist_ok=True)
settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
settings.STATIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
