import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Redis Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Database
    DATABASE_URL: str = os.getenv("POSTGRES_DB_URL")
    
    # Worker Settings
    MAX_SIMULATION_TIME: int = 300  # 5 minutes max per simulation
    TELEMETRY_BATCH_SIZE: int = 1000
    
    # Model Paths
    TIRE_MODEL_PATH: str = "models/tire_degradation.pkl"
    FUEL_MODEL_PATH: str = "models/fuel_consumption.pkl"
    
    class Config:
        env_file = ".env"

settings = Settings()