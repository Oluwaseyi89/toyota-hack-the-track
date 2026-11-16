"""
Tire degradation model.

Target: the degradation rate the car will actually show over the next laps,
i.e. the slope (s/lap) of its clean lap times over the following
HORIZON_LAPS laps of the same stint. Features describe the car's state now
(stint age, recent trend, pace, conditions), so at serving time the model
answers "how fast will this car's tires fall off from here?".
"""
import numpy as np
import pandas as pd

from ..config import MIN_SAMPLES
from ..features import TIRE_FEATURES
from ..laps import slope
from .base import INSUFFICIENT_DATA, TRAINED, TrainResult, evaluate_regressor, regression_pipeline

HORIZON_LAPS = 5
MIN_FUTURE_CLEAN_LAPS = 3
MAX_ABS_TARGET = 2.0  # s/lap; larger slopes are incidents/traffic, not tire wear


def build_dataset(laps: pd.DataFrame):
    rows, targets, groups = [], [], []
    dropped_outliers = 0
    for (track, _car), car in laps.groupby(["track", "car"], sort=False):
        car = car.sort_values("lap_number")
        lap_numbers = car["lap_number"].to_numpy()
        times = car["lap_time"].to_numpy()
        clean = car["clean"].to_numpy()
        stints = car["last_pit_lap"].to_numpy()
        features = car[TIRE_FEATURES].to_numpy(dtype=float)
        for i in range(len(car)):
            if not clean[i]:
                continue
            future = np.flatnonzero(
                (stints == stints[i]) & (lap_numbers > lap_numbers[i])
                & (lap_numbers <= lap_numbers[i] + HORIZON_LAPS) & clean
            )
            if len(future) < MIN_FUTURE_CLEAN_LAPS:
                continue
            target = slope(lap_numbers[future], times[future])
            if abs(target) > MAX_ABS_TARGET:
                dropped_outliers += 1
                continue
            rows.append(features[i])
            targets.append(target)
            groups.append(track)
    if not rows:
        return np.empty((0, len(TIRE_FEATURES))), np.empty(0), np.empty(0), dropped_outliers
    return np.vstack(rows), np.asarray(targets), np.asarray(groups), dropped_outliers


def train_tire_model(laps: pd.DataFrame, tracks, random_state: int = 42) -> TrainResult:
    X, y, groups, dropped = build_dataset(laps)
    result = TrainResult(
        name="tire_degradation",
        status=TRAINED,
        task="regression",
        target=f"future_degradation_s_per_lap (slope of clean lap times over the next {HORIZON_LAPS} stint laps)",
        feature_columns=list(TIRE_FEATURES),
        n_samples=int(len(y)),
        details={"dropped_outlier_targets": dropped, "tracks": sorted(set(groups.tolist()))},
    )
    if len(y) < MIN_SAMPLES["tire_degradation"]:
        result.status = INSUFFICIENT_DATA
        result.reason = f"{len(y)} usable stint windows; need at least {MIN_SAMPLES['tire_degradation']}"
        return result

    make = lambda: regression_pipeline(random_state)  # noqa: E731
    result.metrics = evaluate_regressor(make, X, y, groups, random_state)
    result.metrics["target_mean"] = round(float(y.mean()), 5)
    result.pipeline = make().fit(X, y)
    return result
