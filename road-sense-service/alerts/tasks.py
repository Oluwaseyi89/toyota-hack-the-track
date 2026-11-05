"""
Alert background jobs, scheduled in-process by road_sense_service.jobs.
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from strategy.ml_integration import StrategyMLModels
from strategy.services import build_race_data
from telemetry import metrics

from .models import Alert, AlertRule
from .services import create_alert_if_new

logger = logging.getLogger(__name__)


def check_alert_conditions():
    """Evaluate every active AlertRule against each car's latest lap."""
    rules = list(AlertRule.objects.filter(is_active=True))
    if not rules:
        return "No active alert rules"

    ml_models = StrategyMLModels()
    snapshot = list(metrics.latest_per_vehicle(settings.TELEMETRY_LIVE_WINDOW_SECONDS))
    created = 0

    for telemetry in snapshot:
        race_data = build_race_data(telemetry, snapshot)
        for rule in rules:
            for alert_data in _evaluate_alert_rule(rule, telemetry, race_data, ml_models):
                if create_alert_if_new(alert_data):
                    created += 1

    return f"Generated {created} new alerts for {len(snapshot)} vehicles"


def cleanup_old_alerts(days_old=None):
    """Delete inactive alerts older than ALERT_RETENTION_DAYS."""
    days_old = days_old or settings.ALERT_RETENTION_DAYS
    cutoff = timezone.now() - timedelta(days=days_old)
    deleted, _ = Alert.objects.filter(created_at__lt=cutoff, is_active=False).delete()
    return f"Cleaned up {deleted} old alerts"


def acknowledge_stale_alerts(hours_old=None):
    """Auto-acknowledge alerts left unacknowledged longer than STALE_ALERT_HOURS."""
    hours_old = hours_old or settings.STALE_ALERT_HOURS
    cutoff = timezone.now() - timedelta(hours=hours_old)
    updated = Alert.objects.filter(
        is_active=True, is_acknowledged=False, created_at__lt=cutoff,
    ).update(is_acknowledged=True, acknowledged_at=timezone.now())
    return f"Auto-acknowledged {updated} stale alerts"


def _rule_threshold(rule, key, default):
    condition = rule.condition if isinstance(rule.condition, dict) else {}
    return condition.get(key, default)


def _evaluate_alert_rule(rule, telemetry, race_data, ml_models):
    """Return alert payloads triggered by one rule for one car."""
    alerts = []
    base = {
        "vehicle": telemetry.vehicle,
        "alert_type": rule.alert_type,
        "severity": rule.severity,
        "recommended_action": rule.action_template,
    }

    if rule.alert_type == "TIRE_WEAR":
        prediction = ml_models.predict_tire_degradation(telemetry, race_data)
        rate = prediction.get("grip_loss_rate", 0)
        threshold = _rule_threshold(rule, "threshold", 0.12)
        if rate > threshold:
            alerts.append({
                **base,
                "title": "High Tire Degradation",
                "message": rule.message_template.format(degradation_rate=rate),
                "triggered_by": {
                    "grip_loss_rate": rate, "threshold": threshold, "rule_id": rule.id,
                    "lap": telemetry.lap_number,
                },
            })

    elif rule.alert_type == "FUEL_LOW":
        laps_remaining = race_data["fuel_laps_remaining"]
        threshold = _rule_threshold(rule, "threshold", 8)
        if laps_remaining < threshold:
            alerts.append({
                **base,
                "title": "Low Fuel Warning",
                "message": rule.message_template.format(laps_remaining=laps_remaining),
                "triggered_by": {
                    "laps_remaining": laps_remaining, "threshold": threshold,
                    "rule_id": rule.id, "lap": telemetry.lap_number,
                    "estimated": True,
                },
            })

    elif rule.alert_type == "STRATEGY_OPPORTUNITY":
        positions = _rule_threshold(rule, "value", [2, 3, 4])
        max_gap = _rule_threshold(rule, "max_gap_to_leader", 5.0)
        if telemetry.position in positions and telemetry.gap_to_leader < max_gap:
            alerts.append({
                **base,
                "title": "Strategy Opportunity",
                "message": rule.message_template.format(
                    position=telemetry.position, gap=telemetry.gap_to_leader,
                ),
                "triggered_by": {
                    "position": telemetry.position,
                    "gap_to_leader": telemetry.gap_to_leader,
                    "rule_id": rule.id, "lap": telemetry.lap_number,
                },
            })

    return alerts
