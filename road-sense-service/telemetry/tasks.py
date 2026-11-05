"""
Telemetry background jobs, scheduled in-process by road_sense_service.jobs.

New laps and weather readings are broadcast to WebSocket clients by the
post_save signals in telemetry/signals.py, so these jobs only write data.
"""
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import TelemetryData, WeatherData
from .simulator import advance_race, advance_weather


def advance_race_simulation():
    """Simulate one lap for every simulated car (the live demo feed)."""
    return f"Simulated {advance_race()} laps"


def update_weather_data():
    """Simulated weather reading (random walk from the last one)."""
    weather = advance_weather()
    return f"Weather updated: track {weather.track_temperature}°C"


def cleanup_old_telemetry(hours_old=None):
    """
    Delete telemetry and weather older than TELEMETRY_RETENTION_HOURS.
    Tire telemetry is removed by the database cascade.
    """
    cutoff = timezone.now() - timedelta(hours=hours_old or settings.TELEMETRY_RETENTION_HOURS)
    telemetry_deleted, _ = TelemetryData.objects.filter(timestamp__lt=cutoff).delete()
    weather_deleted, _ = WeatherData.objects.filter(timestamp__lt=cutoff).delete()
    return f"Cleaned up {telemetry_deleted} telemetry and {weather_deleted} weather rows"
