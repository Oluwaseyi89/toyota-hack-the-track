"""
Serving side of the feature contract.

Mirrors model-training-service/road_sense_training/features.py: every feature
a model may list in its manifest's feature_columns is computed here from the
backend's race_data (strategy.services.build_race_data) with the same
definition used in training. Keep the two files in sync.

Unknown values become NaN; each model's Pipeline starts with a median imputer.
"""
import math

import numpy as np

GAP_CAP_SECONDS = 60.0


def _number(value):
    if value is None:
        return math.nan
    try:
        return float(value)
    except (TypeError, ValueError):
        return math.nan


def _capped_gap(value):
    if value is None:
        return GAP_CAP_SECONDS  # leader (ahead) / last car (behind)
    return min(max(float(value), 0.0), GAP_CAP_SECONDS)


def _weather(name):
    def getter(race_data):
        weather = race_data.get("weather") or {}
        if name == "is_raining":
            rainfall = weather.get("rainfall")
            return math.nan if rainfall is None else float(rainfall > 0)
        return _number(weather.get(name))
    return getter


FEATURES = {
    "lap_number": lambda r: _number(r.get("current_lap")),
    "stint_laps": lambda r: _number(r.get("stint_laps")),
    "recent_trend": lambda r: _number(r.get("tire_degradation")),
    "recent_avg_lap_time": lambda r: _number(r.get("average_lap_time")),
    "delta_to_stint_best": lambda r: _number(r.get("delta_to_stint_best")),
    "race_progress": lambda r: _number(r.get("race_progress")),
    "position": lambda r: _number(r.get("position")),
    "gap_to_leader": lambda r: _number(r.get("gap_to_leader")),
    "gap_to_car_ahead": lambda r: _capped_gap(r.get("gap_to_car_ahead")),
    "gap_to_car_behind": lambda r: _capped_gap(r.get("gap_to_car_behind")),
    "track_temperature": _weather("track_temperature"),
    "air_temperature": _weather("air_temperature"),
    "humidity": _weather("humidity"),
    "pressure": _weather("pressure"),
    "wind_speed": _weather("wind_speed"),
    "is_raining": _weather("is_raining"),
}


def unsupported_features(feature_columns):
    return [name for name in feature_columns if name not in FEATURES]


def build_feature_vector(feature_columns, race_data, overrides=None):
    """1 x n float array in the model's feature order."""
    overrides = overrides or {}
    values = [
        _number(overrides[name]) if name in overrides else FEATURES[name](race_data)
        for name in feature_columns
    ]
    return np.asarray([values], dtype=float)
