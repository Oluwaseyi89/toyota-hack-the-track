"""
Load the race CSVs from a Kaggle dataset (or any local folder).

Files are discovered recursively as `<track>_<type>_data.csv`, e.g.
`road_america_pit_data.csv`, so the dataset can use any folder layout
(e.g. /kaggle/input/<dataset-slug>/dataset_files/...).

The per-sample telemetry files are intentionally not loaded: every model
feature must also be computable by the serving backend, which only has
lap-level data. That also keeps memory use low on Kaggle.
"""
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd

from .parsing import read_timing_csv

logger = logging.getLogger(__name__)

DATA_TYPES = ("pit_data", "race_data", "weather_data")


class DatasetError(RuntimeError):
    """Raised when the dataset is missing or unusable (fail loudly, never fake it)."""


@dataclass
class TrackData:
    name: str
    laps: pd.DataFrame                      # <track>_pit_data.csv: one row per car per lap
    results: Optional[pd.DataFrame] = None  # <track>_race_data.csv: classification
    weather: Optional[pd.DataFrame] = None  # <track>_weather_data.csv
    files: Dict[str, str] = field(default_factory=dict)


def discover_tracks(data_dir: Path) -> Dict[str, Dict[str, Path]]:
    tracks: Dict[str, Dict[str, Path]] = {}
    for data_type in DATA_TYPES:
        suffix = f"_{data_type}.csv"
        for path in sorted(Path(data_dir).rglob(f"*{suffix}")):
            track = path.name[: -len(suffix)].lower()
            if track:
                tracks.setdefault(track, {})[data_type] = path
    return tracks


def load_tracks(data_dir: Path) -> List[TrackData]:
    data_dir = Path(data_dir)
    if not data_dir.exists():
        raise DatasetError(f"Data directory {data_dir} does not exist. Attach the dataset to the notebook.")

    discovered = discover_tracks(data_dir)
    tracks = []
    for name, files in sorted(discovered.items()):
        if "pit_data" not in files:
            logger.warning("Skipping %s: no %s_pit_data.csv (lap timing) file", name, name)
            continue
        laps = read_timing_csv(files["pit_data"])
        results = read_timing_csv(files["race_data"]) if "race_data" in files else None
        weather = read_timing_csv(files["weather_data"]) if "weather_data" in files else None
        tracks.append(TrackData(
            name=name, laps=laps, results=results, weather=weather,
            files={k: str(v.relative_to(data_dir)) for k, v in files.items()},
        ))
        logger.info("Loaded %s: %d lap rows, results=%s, weather=%s", name, len(laps),
                    results is not None, weather is not None)

    if not tracks:
        raise DatasetError(
            f"No '<track>_pit_data.csv' files found under {data_dir}. "
            "Check that the race dataset is attached and uses the expected file names."
        )
    return tracks
