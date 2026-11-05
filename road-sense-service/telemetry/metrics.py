"""
Telemetry-derived race metrics shared by the strategy, analytics and alert code.

Everything here is computed from stored TelemetryData rows, so the numbers
reflect the actual (or simulated) laps instead of hardcoded placeholders.
All queries are portable (Postgres and SQLite).
"""
from datetime import timedelta
from statistics import fmean, pstdev

from django.db.models import Max
from django.utils import timezone

from .models import TelemetryData


def lap_seconds(telemetry):
    return telemetry.lap_time.total_seconds()


def latest_per_vehicle(window_seconds=None):
    """
    Latest telemetry row for every vehicle, ordered by race position.
    `window_seconds` drops vehicles whose latest lap is older than that.
    """
    latest_ids = (
        TelemetryData.objects.values("vehicle")
        .annotate(latest_id=Max("id"))
        .values("latest_id")
    )
    queryset = TelemetryData.objects.filter(id__in=latest_ids).select_related("vehicle")
    if window_seconds:
        queryset = queryset.filter(
            timestamp__gte=timezone.now() - timedelta(seconds=window_seconds)
        )
    return queryset.order_by("position", "vehicle__number")


def last_pit_lap(vehicle, before_lap=None):
    """Lap number of the vehicle's most recent pit stop, or None."""
    queryset = TelemetryData.objects.filter(vehicle=vehicle, is_pit_lap=True)
    if before_lap is not None:
        queryset = queryset.filter(lap_number__lte=before_lap)
    return queryset.aggregate(lap=Max("lap_number"))["lap"]


def stint_laps(vehicle, current_lap):
    """Laps completed on the current set of tires (and fuel load)."""
    pit_lap = last_pit_lap(vehicle, before_lap=current_lap)
    return current_lap - (pit_lap or 0)


def recent_laps(vehicle, limit=10, current_stint_only=False):
    """Most recent laps for a vehicle, newest first."""
    queryset = TelemetryData.objects.filter(vehicle=vehicle)
    if current_stint_only:
        pit_lap = last_pit_lap(vehicle)
        if pit_lap is not None:
            queryset = queryset.filter(lap_number__gt=pit_lap)
    return list(queryset.order_by("-lap_number", "-id")[:limit])


def clean_laps(laps):
    """Laps usable for pace analysis (pit laps distort lap time)."""
    return [lap for lap in laps if not lap.is_pit_lap]


def lap_time_trend(laps):
    """
    Least-squares slope of lap time vs lap number, in seconds per lap.
    Positive means the car is getting slower (tire degradation).
    Returns 0.0 when there are fewer than 3 clean laps.
    """
    points = [(lap.lap_number, lap_seconds(lap)) for lap in clean_laps(laps)]
    if len(points) < 3:
        return 0.0
    mean_x = fmean(x for x, _ in points)
    mean_y = fmean(y for _, y in points)
    denominator = sum((x - mean_x) ** 2 for x, _ in points)
    if denominator == 0:
        return 0.0
    return sum((x - mean_x) * (y - mean_y) for x, y in points) / denominator


def average_lap_time(laps):
    times = [lap_seconds(lap) for lap in clean_laps(laps)]
    return fmean(times) if times else None


def lap_time_stdev(laps):
    times = [lap_seconds(lap) for lap in clean_laps(laps)]
    return pstdev(times) if len(times) >= 2 else None


def sector_averages(laps):
    """Average time per sector (seconds) over laps that have sector data."""
    averages = []
    for field in ("sector1_time", "sector2_time", "sector3_time"):
        values = [
            getattr(lap, field).total_seconds()
            for lap in clean_laps(laps)
            if getattr(lap, field)
        ]
        if not values:
            return []
        averages.append(round(fmean(values), 3))
    return averages


def gap_to_car_ahead(telemetry, snapshot=None):
    """Seconds to the car one position ahead, or None for the leader."""
    if telemetry.position <= 1:
        return None
    snapshot = snapshot if snapshot is not None else latest_per_vehicle()
    for other in snapshot:
        if other.position == telemetry.position - 1:
            return max(0.0, telemetry.gap_to_leader - other.gap_to_leader)
    return None
