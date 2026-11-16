"""
Build one tidy row per car per lap from a track's timing sheets, with the
contract features from features.py plus the fields the trainers need for
labels (pit stops, clean laps, positions, weather).
"""
import logging
from typing import Dict, Tuple

import numpy as np
import pandas as pd

from .data_loader import TrackData
from .features import GAP_CAP_SECONDS, MIN_TREND_LAPS, TREND_WINDOW_LAPS, WEATHER_COLUMNS
from .parsing import is_blank, time_of_day_seconds, time_to_seconds, to_number

logger = logging.getLogger(__name__)

CAUTION_PATTERN = "FCY|SC|YELLOW|RED"
OUTLIER_FACTOR = 1.07


def _column(frame, name, default=np.nan):
    return frame[name] if name in frame.columns else pd.Series(default, index=frame.index)


def slope(x, y) -> float:
    """Least-squares slope of y on x (0.0 when undefined)."""
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    if len(x) < 2:
        return 0.0
    dx = x - x.mean()
    denominator = float((dx ** 2).sum())
    return float((dx * (y - y.mean())).sum() / denominator) if denominator else 0.0


# ---------------------------------------------------------------------------
# Laps, pit stops and clean laps
# ---------------------------------------------------------------------------

def _base_laps(raw: pd.DataFrame) -> pd.DataFrame:
    for required in ("NUMBER", "LAP_NUMBER"):
        if required not in raw.columns:
            raise ValueError(f"lap timing file has no {required} column")

    laps = pd.DataFrame({
        "car": to_number(raw["NUMBER"]),
        "lap_number": to_number(raw["LAP_NUMBER"]),
        "lap_time": _column(raw, "LAP_TIME").map(time_to_seconds),
        "elapsed": _column(raw, "ELAPSED").map(time_to_seconds),
        "time_of_day": _column(raw, "HOUR").map(time_of_day_seconds),
        "crossed_in_pit": ~is_blank(_column(raw, "CROSSING_FINISH_LINE_IN_PIT")),
        "pit_time": _column(raw, "PIT_TIME").map(time_to_seconds),
        "caution": _column(raw, "FLAG_AT_FL", "").astype(str).str.upper()
                   .str.contains(CAUTION_PATTERN, regex=True, na=False),
    })
    laps = laps.dropna(subset=["car", "lap_number"])
    laps["car"] = laps["car"].astype(int)
    laps["lap_number"] = laps["lap_number"].astype(int)
    laps = laps[laps["lap_number"] > 0]
    laps = laps.drop_duplicates(["car", "lap_number"], keep="last")
    laps = laps.sort_values(["car", "lap_number"]).reset_index(drop=True)

    # Fill whichever of lap time / elapsed time is missing from the other.
    elapsed_diff = laps.groupby("car")["elapsed"].diff()
    laps["lap_time"] = laps["lap_time"].fillna(elapsed_diff)
    if laps["elapsed"].isna().all():
        laps["elapsed"] = laps.groupby("car")["lap_time"].cumsum()
    return laps


def _pit_stop_laps(car_laps: pd.DataFrame) -> list:
    """
    Lap numbers on which the car stopped (the in-lap). Consecutive flagged
    laps (in-lap + out-lap) are one stop. If only PIT_TIME is present, it is
    recorded on the out-lap, so the stop is the lap before.
    """
    if car_laps["crossed_in_pit"].any():
        flagged = car_laps.loc[car_laps["crossed_in_pit"], "lap_number"].tolist()
    else:
        flagged = (car_laps.loc[car_laps["pit_time"] > 0, "lap_number"] - 1).tolist()
    stops = []
    for lap in sorted(set(flagged)):
        if lap <= 0:
            continue
        if stops and lap - stops[-1] <= 1:
            continue
        stops.append(lap)
    return stops


def _add_stints_and_clean_flags(laps: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[int, list]]:
    laps = laps.copy()
    stops_by_car = {}
    last_pit = np.zeros(len(laps), dtype=int)
    is_pit = np.zeros(len(laps), dtype=bool)
    pit_affected = np.zeros(len(laps), dtype=bool)

    for car, idx in laps.groupby("car").groups.items():
        car_laps = laps.loc[idx]
        stops = _pit_stop_laps(car_laps)
        stops_by_car[car] = stops
        for position, row_index in enumerate(idx):
            lap = car_laps.at[row_index, "lap_number"]
            previous = [s for s in stops if s <= lap]
            last_pit[row_index] = previous[-1] if previous else 0
            is_pit[row_index] = lap in stops
            pit_affected[row_index] = (
                lap in stops or (lap - 1) in stops
                or car_laps.at[row_index, "crossed_in_pit"]
                or car_laps.at[row_index, "pit_time"] > 0
            )

    laps["last_pit_lap"] = last_pit
    laps["is_pit_lap"] = is_pit
    laps["stint_laps"] = laps["lap_number"] - laps["last_pit_lap"]

    racing = ~pit_affected & ~laps["caution"] & laps["lap_time"].notna() & (laps["lap_number"] > 1)
    car_median = laps["lap_time"].where(racing).groupby(laps["car"]).transform("median")
    laps["clean"] = racing & (laps["lap_time"] <= car_median * OUTLIER_FACTOR)
    return laps, stops_by_car


# ---------------------------------------------------------------------------
# Positions, gaps and rolling stint features
# ---------------------------------------------------------------------------

def _add_positions(laps: pd.DataFrame) -> pd.DataFrame:
    laps = laps.copy()
    for column in ("position", "gap_to_leader", "gap_to_car_ahead", "gap_to_car_behind"):
        laps[column] = np.nan
    for _, idx in laps.groupby("lap_number").groups.items():
        group = laps.loc[idx].dropna(subset=["elapsed"]).sort_values("elapsed")
        if group.empty:
            continue
        elapsed = group["elapsed"].to_numpy()
        ahead = np.diff(elapsed, prepend=np.nan)
        behind = np.append(np.diff(elapsed), np.nan)
        laps.loc[group.index, "position"] = np.arange(1, len(group) + 1)
        laps.loc[group.index, "gap_to_leader"] = elapsed - elapsed[0]
        laps.loc[group.index, "gap_to_car_ahead"] = np.nan_to_num(ahead, nan=GAP_CAP_SECONDS)
        laps.loc[group.index, "gap_to_car_behind"] = np.nan_to_num(behind, nan=GAP_CAP_SECONDS)
    for column in ("gap_to_car_ahead", "gap_to_car_behind"):
        laps[column] = laps[column].clip(0, GAP_CAP_SECONDS)
    return laps


def _add_stint_features(laps: pd.DataFrame) -> pd.DataFrame:
    laps = laps.copy()
    trend = np.zeros(len(laps))
    average = np.full(len(laps), np.nan)
    delta = np.full(len(laps), np.nan)

    for _, idx in laps.groupby("car").groups.items():
        car = laps.loc[idx]
        lap_numbers = car["lap_number"].to_numpy()
        times = car["lap_time"].to_numpy()
        clean = car["clean"].to_numpy()
        last_pits = car["last_pit_lap"].to_numpy()
        for i, row_index in enumerate(idx):
            in_stint = (last_pits[: i + 1] == last_pits[i]) & (lap_numbers[: i + 1] > last_pits[i])
            stint_positions = np.flatnonzero(in_stint)
            window = stint_positions[-TREND_WINDOW_LAPS:]
            window_clean = window[clean[window]]
            if len(window_clean) >= MIN_TREND_LAPS:
                trend[row_index] = slope(lap_numbers[window_clean], times[window_clean])
            if len(window_clean):
                average[row_index] = times[window_clean].mean()
            stint_clean = stint_positions[clean[stint_positions]]
            if len(stint_clean) and not np.isnan(times[i]):
                delta[row_index] = times[i] - times[stint_clean].min()

    laps["recent_trend"] = trend
    laps["recent_avg_lap_time"] = average
    laps["delta_to_stint_best"] = delta
    return laps


# ---------------------------------------------------------------------------
# Weather
# ---------------------------------------------------------------------------

def _parse_weather(weather: pd.DataFrame) -> pd.DataFrame:
    epoch = to_number(_column(weather, "TIME_UTC_SECONDS"))
    tod = (epoch % 86400).astype(float)
    if tod.isna().all():
        tod = _column(weather, "TIME_UTC_STR").map(time_of_day_seconds).astype(float)
    parsed = pd.DataFrame({
        "tod": tod,
        "track_temperature": to_number(_column(weather, "TRACK_TEMP")),
        "air_temperature": to_number(_column(weather, "AIR_TEMP")),
        "humidity": to_number(_column(weather, "HUMIDITY")),
        "pressure": to_number(_column(weather, "PRESSURE")),
        "wind_speed": to_number(_column(weather, "WIND_SPEED")),
        "is_raining": (to_number(_column(weather, "RAIN")).fillna(0) > 0).astype(float),
    })
    # Treat sensor zeros for temperatures as missing (they are not real readings).
    for column in ("track_temperature", "air_temperature"):
        parsed.loc[parsed[column] <= 0, column] = np.nan
    return parsed


def _attach_weather(laps: pd.DataFrame, weather_raw) -> Tuple[pd.DataFrame, str]:
    laps = laps.copy()
    if weather_raw is None or weather_raw.empty:
        for column in WEATHER_COLUMNS:
            laps[column] = np.nan
        return laps, "missing"

    weather = _parse_weather(weather_raw)
    session = weather[WEATHER_COLUMNS].median(numeric_only=True)

    timed = weather.dropna(subset=["tod"]).sort_values("tod")
    lap_tod = laps["time_of_day"]
    if not timed.empty and lap_tod.notna().mean() > 0.5:
        low, high = timed["tod"].min() - 600, timed["tod"].max() + 600
        best_offset, best_fraction = None, 0.0
        # Lap clock times are local; weather is UTC. Find the hour offset that
        # puts the laps inside the weather recording window.
        for hours in sorted(range(-12, 13), key=abs):
            shifted = (lap_tod + hours * 3600) % 86400
            fraction = float(((shifted >= low) & (shifted <= high)).mean())
            if fraction > best_fraction + 1e-9:
                best_offset, best_fraction = hours, fraction
        if best_offset is not None and best_fraction >= 0.9:
            laps["_tod"] = (lap_tod + best_offset * 3600) % 86400
            ordered = laps.reset_index().sort_values("_tod")
            merged = pd.merge_asof(
                ordered.dropna(subset=["_tod"]), timed[["tod", *WEATHER_COLUMNS]],
                left_on="_tod", right_on="tod", direction="nearest", tolerance=900,
            ).set_index("index")
            for column in WEATHER_COLUMNS:
                laps[column] = merged[column].reindex(laps.index).fillna(session.get(column))
            return laps.drop(columns="_tod"), f"time_aligned(offset={best_offset:+d}h)"

    for column in WEATHER_COLUMNS:
        laps[column] = session.get(column, np.nan)
    return laps, "session_median"


# ---------------------------------------------------------------------------

def build_lap_table(track: TrackData) -> Tuple[pd.DataFrame, Dict]:
    laps = _base_laps(track.laps)
    laps, stops_by_car = _add_stints_and_clean_flags(laps)
    laps = _add_positions(laps)
    laps = _add_stint_features(laps)
    laps, weather_alignment = _attach_weather(laps, track.weather)

    race_laps = laps["lap_number"].max()
    if track.results is not None and "LAPS" in track.results.columns:
        result_laps = to_number(track.results["LAPS"]).max()
        if pd.notna(result_laps) and result_laps > 0:
            race_laps = int(result_laps)
    laps["race_laps_total"] = race_laps
    laps["race_progress"] = (laps["lap_number"] / race_laps).clip(0, 1)
    laps["track"] = track.name

    summary = {
        "track": track.name,
        "rows": int(len(laps)),
        "cars": int(laps["car"].nunique()),
        "race_laps": int(race_laps),
        "pit_stops": int(sum(len(s) for s in stops_by_car.values())),
        "clean_laps": int(laps["clean"].sum()),
        "weather_alignment": weather_alignment,
        "files": track.files,
    }
    logger.info("Lap table %s: %s", track.name, summary)
    return laps, summary
