import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "KAWACH"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://keshav@localhost:5439/kawach"
    )
    
    # JWT Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_key_kawach_2026_datathon_ksp_9d8df1")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    class Config:
        case_sensitive = True

settings = Settings()
