"""
Run configuration, read from environment variables (the Kaggle notebook sets
them from Kaggle Secrets) with CLI overrides in train.py.
"""
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

# The serving backend unpickles these artifacts, so library versions must
# match road-sense-service/requirements.txt exactly (major.minor at least).
PINNED_VERSIONS = {
    "python": "3.11",
    "scikit-learn": "1.5.2",
    "numpy": "2.1.3",
    "joblib": "1.4.2",
}

MANIFEST_SCHEMA_VERSION = 1
DEFAULT_BUCKET = "road-sense-models"
DEFAULT_STORAGE_PREFIX = "models"

# Minimum training rows per model; below this the model is reported as
# "insufficient_data" instead of being trained on too little (or fake) data.
MIN_SAMPLES = {
    "tire_degradation": 100,
    "weather_impact": 100,
    "pit_strategy": 30,
}


def _default_data_dir() -> Path:
    if Path("/kaggle/input").exists():
        return Path("/kaggle/input")
    return Path("data")


def _default_output_dir() -> Path:
    if Path("/kaggle/working").exists():
        return Path("/kaggle/working/road_sense_artifacts")
    return Path("outputs")


@dataclass
class TrainingConfig:
    data_dir: Path
    output_dir: Path
    supabase_url: Optional[str]
    supabase_key: Optional[str]
    bucket: str
    storage_prefix: str
    random_state: int = 42

    @classmethod
    def from_env(cls, data_dir=None, output_dir=None) -> "TrainingConfig":
        return cls(
            data_dir=Path(data_dir or os.environ.get("ROAD_SENSE_DATA_DIR") or _default_data_dir()),
            output_dir=Path(output_dir or os.environ.get("ROAD_SENSE_OUTPUT_DIR") or _default_output_dir()),
            supabase_url=(os.environ.get("SUPABASE_URL") or "").rstrip("/") or None,
            supabase_key=os.environ.get("SUPABASE_SERVICE_KEY") or None,
            bucket=os.environ.get("SUPABASE_MODELS_BUCKET") or DEFAULT_BUCKET,
            storage_prefix=os.environ.get("SUPABASE_MODELS_PREFIX") or DEFAULT_STORAGE_PREFIX,
        )

    @property
    def can_upload(self) -> bool:
        return bool(self.supabase_url and self.supabase_key)
