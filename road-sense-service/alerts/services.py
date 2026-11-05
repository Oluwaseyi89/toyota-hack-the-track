"""
Alert creation shared by the scheduled job, the check-conditions API and the
tire telemetry signal, so every path de-duplicates and broadcasts the same way.
"""
import logging
from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.utils import timezone

from .models import Alert

logger = logging.getLogger(__name__)


def create_alert_if_new(alert_data):
    """
    Create and broadcast an alert unless an identical one (same vehicle, type
    and title) is still active and unacknowledged within the de-dup window.
    Returns the new Alert, or None when it was a duplicate.
    """
    window_start = timezone.now() - timedelta(minutes=settings.ALERT_DEDUP_MINUTES)
    duplicate = Alert.objects.filter(
        vehicle=alert_data.get("vehicle"),
        alert_type=alert_data["alert_type"],
        title=alert_data["title"],
        is_active=True,
        is_acknowledged=False,
        created_at__gte=window_start,
    ).exists()
    if duplicate:
        return None

    alert = Alert.objects.create(**alert_data)
    broadcast_alert(alert)
    return alert


def broadcast_alert(alert):
    """Send an alert to connected WebSocket clients."""
    try:
        async_to_sync(get_channel_layer().group_send)(
            "alert_updates",
            {
                "type": "alert_update",
                "data": {
                    "id": alert.id,
                    "vehicle_id": alert.vehicle.vehicle_id if alert.vehicle else None,
                    "type": alert.alert_type,
                    "severity": alert.severity,
                    "title": alert.title,
                    "message": alert.message,
                    "action": alert.recommended_action,
                    "timestamp": alert.created_at.isoformat(),
                },
            },
        )
    except Exception:
        logger.exception("Failed to broadcast alert %s", alert.id)
