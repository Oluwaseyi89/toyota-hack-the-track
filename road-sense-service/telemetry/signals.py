"""
Telemetry signals: broadcast new data to WebSocket clients.

Signals only broadcast (plus tire alerts, which depend on the single new
reading). Strategy, alert and analytics recalculation happens on the
in-process schedule in road_sense_service.jobs, so each job has one trigger.
"""
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import TelemetryData, TireTelemetry, WeatherData

logger = logging.getLogger(__name__)


def _broadcast(group, event_type, data):
    try:
        async_to_sync(get_channel_layer().group_send)(group, {"type": event_type, "data": data})
    except Exception:
        logger.exception("Failed to broadcast %s to %s", event_type, group)


@receiver(post_save, sender=TelemetryData)
def handle_new_telemetry(sender, instance, created, **kwargs):
    if created:
        transaction.on_commit(lambda: _broadcast_telemetry(instance))


@receiver(post_save, sender=WeatherData)
def handle_weather_update(sender, instance, created, **kwargs):
    if created:
        transaction.on_commit(lambda: _broadcast_weather(instance))


@receiver(post_save, sender=TireTelemetry)
def handle_tire_telemetry(sender, instance, created, **kwargs):
    if created:
        transaction.on_commit(lambda: _process_tire_telemetry(instance))


def _broadcast_telemetry(telemetry):
    _broadcast("telemetry_updates", "telemetry.update", {
        "vehicle_id": telemetry.vehicle.vehicle_id,
        "lap_number": telemetry.lap_number,
        "lap_time": telemetry.lap_time.total_seconds(),
        "speed": telemetry.speed,
        "position": telemetry.position,
        "gap_to_leader": telemetry.gap_to_leader,
        "rpm": telemetry.rpm,
        "gear": telemetry.gear,
        "throttle": telemetry.throttle,
        "brake": telemetry.brake,
        "is_pit_lap": telemetry.is_pit_lap,
        "is_simulated": telemetry.is_simulated,
        "timestamp": telemetry.timestamp.isoformat(),
    })


def _broadcast_weather(weather):
    _broadcast("weather_updates", "weather.update", {
        "track_temperature": weather.track_temperature,
        "air_temperature": weather.air_temperature,
        "humidity": weather.humidity,
        "pressure": weather.pressure,
        "wind_speed": weather.wind_speed,
        "wind_direction": weather.wind_direction,
        "rainfall": weather.rainfall,
        "is_simulated": weather.is_simulated,
        "timestamp": weather.timestamp.isoformat(),
    })


def _process_tire_telemetry(tire):
    telemetry = tire.telemetry
    _broadcast("tire_updates", "tire.update", {
        "vehicle_id": telemetry.vehicle.vehicle_id,
        "lap_number": telemetry.lap_number,
        "front_left_temp": tire.front_left_temp,
        "front_right_temp": tire.front_right_temp,
        "rear_left_temp": tire.rear_left_temp,
        "rear_right_temp": tire.rear_right_temp,
        "front_left_pressure": tire.front_left_pressure,
        "front_right_pressure": tire.front_right_pressure,
        "rear_left_pressure": tire.rear_left_pressure,
        "rear_right_pressure": tire.rear_right_pressure,
        "is_simulated": telemetry.is_simulated,
        "timestamp": telemetry.timestamp.isoformat(),
    })
    try:
        _check_tire_alerts(tire)
    except Exception:
        logger.exception("Tire alert check failed for telemetry %s", telemetry.id)


def _check_tire_alerts(tire):
    """Tire temperature/pressure alerts, de-duplicated like all other alerts."""
    from alerts.services import create_alert_if_new

    vehicle = tire.telemetry.vehicle
    fl_t, fr_t = tire.front_left_temp, tire.front_right_temp
    fl_p, fr_p = tire.front_left_pressure, tire.front_right_pressure
    candidates = []

    if fl_t is not None and fr_t is not None:
        temp_diff = abs(fl_t - fr_t)
        if temp_diff > 15:
            candidates.append({
                "alert_type": "TIRE_WEAR", "severity": "MEDIUM",
                "title": "Uneven Front Tire Temperatures",
                "message": f"Front tire temperature difference: {temp_diff:.1f}°C",
                "recommended_action": "Check tire pressures and suspension setup",
                "triggered_by": {"temperature_difference": temp_diff,
                                 "front_left_temp": fl_t, "front_right_temp": fr_t},
            })
        if max(fl_t, fr_t) > 110:
            candidates.append({
                "alert_type": "TIRE_WEAR", "severity": "HIGH",
                "title": "High Tire Temperatures",
                "message": "Front tire temperatures exceed the optimal range (>110°C)",
                "recommended_action": "Consider reducing pace or adjusting setup",
                "triggered_by": {"front_left_temp": fl_t, "front_right_temp": fr_t},
            })

    if fl_p is not None and fr_p is not None:
        pressure_diff = abs(fl_p - fr_p)
        if pressure_diff > 1.0:
            candidates.append({
                "alert_type": "SYSTEM_WARNING", "severity": "MEDIUM",
                "title": "Uneven Tire Pressures",
                "message": f"Front tire pressure difference: {pressure_diff:.1f} PSI",
                "recommended_action": "Check for leaks and adjust pressures",
                "triggered_by": {"pressure_difference": pressure_diff,
                                 "front_left_pressure": fl_p, "front_right_pressure": fr_p},
            })

    for alert_data in candidates:
        create_alert_if_new({"vehicle": vehicle, **alert_data})
