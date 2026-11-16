"""
Weather impact model.

Target: how much slower (fraction) a clean lap is than the same car's median
clean lap at that track. Stint age and lap number are included so tire wear
and fuel burn are not attributed to the weather. At serving time the weather
impact is prediction(current weather) - prediction(reference weather), with
the reference conditions stored in the manifest.
"""
import numpy as np
import pandas as pd

from ..config import MIN_SAMPLES
from ..features import WEATHER_COLUMNS, WEATHER_FEATURES
from .base import INSUFFICIENT_DATA, SKIPPED, TRAINED, TrainResult, evaluate_regressor, regression_pipeline


def train_weather_model(laps: pd.DataFrame, tracks, random_state: int = 42) -> TrainResult:
    result = TrainResult(
        name="weather_impact",
        status=TRAINED,
        task="regression",
        target="lap_time_delta_fraction (clean lap time / car's median clean lap at the track - 1)",
        feature_columns=list(WEATHER_FEATURES),
    )

    clean = laps[laps["clean"]].copy()
    if clean["track_temperature"].isna().all() and clean["air_temperature"].isna().all():
        result.status = SKIPPED
        result.reason = "No weather data could be matched to any lap"
        return result

    car_median = clean.groupby(["track", "car"])["lap_time"].transform("median")
    clean["target"] = clean["lap_time"] / car_median - 1.0
    clean = clean.dropna(subset=["target"])
    clean = clean[clean["track_temperature"].notna() | clean["air_temperature"].notna()]

    X = clean[WEATHER_FEATURES].to_numpy(dtype=float)
    y = clean["target"].to_numpy(dtype=float)
    groups = clean["track"].to_numpy()
    result.n_samples = int(len(y))
    result.details = {
        "tracks": sorted(clean["track"].unique().tolist()),
        # Serving measures impact relative to these typical conditions.
        "reference_conditions": {
            column: (None if pd.isna(value) else round(float(value), 3))
            for column, value in clean[WEATHER_COLUMNS].median(numeric_only=True).items()
        },
    }

    if len(y) < MIN_SAMPLES["weather_impact"]:
        result.status = INSUFFICIENT_DATA
        result.reason = f"{len(y)} clean laps with weather; need at least {MIN_SAMPLES['weather_impact']}"
        return result

    make = lambda: regression_pipeline(random_state)  # noqa: E731
    result.metrics = evaluate_regressor(make, X, y, groups, random_state)
    result.pipeline = make().fit(X, y)
    return result
