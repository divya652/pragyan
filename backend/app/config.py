import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Creating a Unified View of a Patient Across Systems"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "healthcare_interoperability_super_secret_key_2026_unfied_patient_view")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours for clinical shift sessions
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./unified_patient_records.db")

    class Config:
        case_sensitive = True

settings = Settings()
