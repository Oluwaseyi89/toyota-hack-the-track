"""
Pit strategy classifier with labels derived from what actually happened.

Each real pit stop is one sample. Features are the car's state on the lap
before it stopped (the decision point). The label describes the stop relative
to the car's rivals and the race:

  UNDERCUT  the car directly ahead (within RIVAL_GAP_SECONDS) pitted after us,
            within RIVAL_WINDOW_LAPS: we stopped first to jump it
  OVERCUT   a car directly ahead or behind (within RIVAL_GAP_SECONDS) had
            pitted within the previous RIVAL_WINDOW_LAPS: we stayed out longer
  EARLY / MIDDLE / LATE   otherwise, by race progress at the stop

The outcome is measured as positions gained or lost OUTCOME_LAPS after the
stop; stops that held or gained position get double sample weight, so the
model leans towards choices that worked. This replaces the old hand-written
_determine_optimal_pit_strategy rule, which the model could only imitate.
"""
from collections import Counter

import numpy as np
import pandas as pd

from ..config import MIN_SAMPLES
from ..features import PIT_FEATURES
from .base import INSUFFICIENT_DATA, TRAINED, TrainResult, classification_pipeline, evaluate_classifier

RIVAL_GAP_SECONDS = 3.0
RIVAL_WINDOW_LAPS = 5
OUTCOME_LAPS = 5
EARLY_BEFORE = 0.35
LATE_FROM = 0.65
SUCCESS_WEIGHT = 2.0


def _label_stop(decision, track_laps, stops_by_car, stop_lap):
    by_position = track_laps.get(stop_lap - 1, {})
    position = decision["position"]
    ahead = by_position.get(position - 1)
    behind = by_position.get(position + 1)

    if ahead is not None and decision["gap_to_car_ahead"] <= RIVAL_GAP_SECONDS:
        if any(stop_lap < s <= stop_lap + RIVAL_WINDOW_LAPS for s in stops_by_car.get(ahead, [])):
            return "UNDERCUT"

    close_rivals = []
    if ahead is not None and decision["gap_to_car_ahead"] <= RIVAL_GAP_SECONDS:
        close_rivals.append(ahead)
    if behind is not None and decision["gap_to_car_behind"] <= RIVAL_GAP_SECONDS:
        close_rivals.append(behind)
    for rival in close_rivals:
        if any(stop_lap - RIVAL_WINDOW_LAPS <= s < stop_lap for s in stops_by_car.get(rival, [])):
            return "OVERCUT"

    progress = decision["race_progress"]
    if progress < EARLY_BEFORE:
        return "EARLY"
    if progress < LATE_FROM:
        return "MIDDLE"
    return "LATE"


def build_dataset(laps: pd.DataFrame):
    rows, labels, weights, groups = [], [], [], []
    outcomes = Counter()
    for track, track_frame in laps.groupby("track", sort=False):
        indexed = track_frame.set_index(["car", "lap_number"])
        # lap -> {position: car}
        position_map = {
            lap: dict(zip(frame["position"].dropna().astype(int), frame.loc[frame["position"].notna(), "car"]))
            for lap, frame in track_frame.groupby("lap_number")
        }
        stops_by_car = {
            car: frame.loc[frame["is_pit_lap"], "lap_number"].tolist()
            for car, frame in track_frame.groupby("car")
        }
        last_lap_by_car = track_frame.groupby("car")["lap_number"].max().to_dict()

        for car, stops in stops_by_car.items():
            for stop_lap in stops:
                key = (car, stop_lap - 1)
                if key not in indexed.index:
                    continue
                decision = indexed.loc[key]
                if pd.isna(decision["position"]):
                    continue
                label = _label_stop(decision, position_map, stops_by_car, stop_lap)

                outcome_lap = min(stop_lap + OUTCOME_LAPS, last_lap_by_car[car])
                after = indexed["position"].get((car, outcome_lap), np.nan)
                gained = decision["position"] - after if pd.notna(after) else 0
                outcomes["held_or_gained" if gained >= 0 else "lost"] += 1

                rows.append(decision[PIT_FEATURES].to_numpy(dtype=float))
                labels.append(label)
                weights.append(SUCCESS_WEIGHT if gained >= 0 else 1.0)
                groups.append(track)

    if not rows:
        return (np.empty((0, len(PIT_FEATURES))), np.empty(0, dtype=object),
                np.empty(0), np.empty(0), outcomes)
    return (np.vstack(rows), np.asarray(labels, dtype=object), np.asarray(weights),
            np.asarray(groups), outcomes)


def train_pit_strategy_model(laps: pd.DataFrame, tracks, random_state: int = 42) -> TrainResult:
    X, y, weights, groups, outcomes = build_dataset(laps)
    distribution = {str(k): int(v) for k, v in Counter(y.tolist()).items()}
    result = TrainResult(
        name="pit_strategy",
        status=TRAINED,
        task="classification",
        target="strategy_type of real pit stops (relative to rivals and race progress)",
        feature_columns=list(PIT_FEATURES),
        n_samples=int(len(y)),
        details={
            "label_distribution": distribution,
            "stop_outcomes": dict(outcomes),
            "labelling": {
                "rival_gap_seconds": RIVAL_GAP_SECONDS,
                "rival_window_laps": RIVAL_WINDOW_LAPS,
                "outcome_laps": OUTCOME_LAPS,
                "early_before_progress": EARLY_BEFORE,
                "late_from_progress": LATE_FROM,
                "success_weight": SUCCESS_WEIGHT,
            },
            "tracks": sorted(set(groups.tolist())),
        },
    )
    if len(y) < MIN_SAMPLES["pit_strategy"]:
        result.status = INSUFFICIENT_DATA
        result.reason = (f"{len(y)} real pit stops in the dataset; need at least "
                         f"{MIN_SAMPLES['pit_strategy']} (sprint races have few stops)")
        return result
    if len(distribution) < 2:
        result.status = INSUFFICIENT_DATA
        result.reason = f"All stops have the same label ({next(iter(distribution))}); nothing to learn"
        return result

    make = lambda: classification_pipeline(random_state)  # noqa: E731
    result.metrics = evaluate_classifier(make, X, y, groups, weights, random_state)
    result.pipeline = make().fit(X, y, model__sample_weight=weights)
    result.label_classes = [str(c) for c in result.pipeline.classes_]
    return result
