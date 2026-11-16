"""
Parsing helpers for the race timing CSVs (semicolon-separated timing sheets,
lap times like "1:39.456", elapsed times like "1:02:03.456").

Unlike the previous loader, unparseable values become NaN, never 0: a zero
lap time is a fake data point, a missing one is just missing.
"""
import re
from pathlib import Path

import numpy as np
import pandas as pd

_MISSING = {"", "-", "NULL", "NONE", "NAN"}


def clean_column_name(name) -> str:
    """' S1_SECONDS' -> 'S1_SECONDS', 'Ecm Car Id' -> 'ECM_CAR_ID'."""
    name = str(name).lstrip("﻿").strip()
    name = re.sub(r"[^0-9A-Za-z_]+", "_", name)
    name = re.sub(r"__+", "_", name).strip("_")
    return name.upper()


def time_to_seconds(value) -> float:
    """'1:39.456' -> 99.456, '1:02:03.5' -> 3723.5, '99.4' -> 99.4, else NaN."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return np.nan
    if isinstance(value, (int, float, np.integer, np.floating)):
        return float(value) if value > 0 else np.nan
    text = str(value).strip().lstrip("+")
    if text.upper() in _MISSING:
        return np.nan
    try:
        parts = [float(p) for p in text.split(":")]
    except ValueError:
        return np.nan
    seconds = 0.0
    for part in parts:
        seconds = seconds * 60.0 + part
    return seconds if seconds > 0 else np.nan


def time_of_day_seconds(value) -> float:
    """Clock time '11:26:13.456' (or a datetime string) -> seconds since midnight."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return np.nan
    text = str(value).strip()
    if text.upper() in _MISSING:
        return np.nan
    match = re.search(r"(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)\s*([AaPp][Mm])?", text)
    if not match:
        return np.nan
    hours, minutes, seconds = int(match.group(1)), int(match.group(2)), float(match.group(3))
    meridiem = (match.group(4) or "").upper()
    if meridiem == "PM" and hours < 12:
        hours += 12
    elif meridiem == "AM" and hours == 12:
        hours = 0
    return hours * 3600 + minutes * 60 + seconds


def to_number(series: pd.Series) -> pd.Series:
    """Numeric conversion that also accepts decimal commas."""
    if series.dtype == object:
        series = series.astype(str).str.strip().str.replace(",", ".", regex=False)
    return pd.to_numeric(series, errors="coerce")


def is_blank(series: pd.Series) -> pd.Series:
    return series.isna() | series.astype(str).str.strip().str.upper().isin(_MISSING)


def read_timing_csv(path: Path) -> pd.DataFrame:
    """
    Read a timing CSV, detecting ';' vs ',' separators, and normalise the
    column names (the source files have stray spaces in their headers).
    """
    for sep in (";", ",", "\t"):
        try:
            frame = pd.read_csv(path, sep=sep, dtype=str, keep_default_na=False,
                                encoding="utf-8-sig", low_memory=False)
        except (pd.errors.ParserError, UnicodeDecodeError):
            continue
        if frame.shape[1] > 1:
            frame.columns = [clean_column_name(c) for c in frame.columns]
            frame = frame.loc[:, ~frame.columns.duplicated()]
            return frame.replace({"": np.nan})
    raise ValueError(f"Could not parse {path} as ';', ',' or tab separated CSV")
