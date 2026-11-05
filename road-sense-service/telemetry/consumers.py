import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

UPDATE_GROUPS = (
    "telemetry_updates",
    "weather_updates",
    "tire_updates",
    "alert_updates",
    "strategy_updates",
)


def _latest_telemetry():
    from utils.data_processors import TelemetryProcessor
    return TelemetryProcessor().get_latest_telemetry()


def _current_weather():
    from telemetry.models import WeatherData
    weather = WeatherData.objects.order_by("-timestamp", "-id").first()
    if not weather:
        return {}
    return {
        "track_temperature": weather.track_temperature,
        "air_temperature": weather.air_temperature,
        "humidity": weather.humidity,
        "rainfall": weather.rainfall,
        "is_simulated": weather.is_simulated,
    }


class TelemetryConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # The session user is resolved by AuthMiddlewareStack in asgi.py.
        # Reject the handshake (HTTP 403) for anonymous users or users without
        # live-data access, before joining any broadcast group.
        user = self.scope.get("user")
        if not (user and user.is_authenticated and user.can_access_live_data):
            self.joined_groups = False
            await self.close()
            return
        self.joined_groups = True

        for group in UPDATE_GROUPS:
            await self.channel_layer.group_add(group, self.channel_name)

        await self.accept()
        await self.send_json({
            "type": "connection_established",
            "message": "WebSocket connected to all update groups",
        })

    async def disconnect(self, close_code):
        if not getattr(self, "joined_groups", False):
            return
        for group in UPDATE_GROUPS:
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            message_type = json.loads(text_data or "{}").get("type")
        except (json.JSONDecodeError, AttributeError):
            logger.debug("Ignoring malformed WebSocket message")
            return

        if message_type == "subscribe_telemetry":
            await self.send_json({
                "type": "current_telemetry",
                "data": await database_sync_to_async(_latest_telemetry)(),
            })
        elif message_type == "request_current_data":
            await self.send_json({
                "type": "current_data",
                "telemetry": await database_sync_to_async(_latest_telemetry)(),
                "weather": await database_sync_to_async(_current_weather)(),
            })

    async def send_json(self, payload):
        await self.send(text_data=json.dumps(payload))

    # --- Group event handlers (event "type" a.b -> method a_b) -------------

    async def telemetry_update(self, event):
        await self.send_json({"type": "telemetry", "data": event["data"]})

    async def weather_update(self, event):
        await self.send_json({"type": "weather", "data": event["data"]})

    async def tire_update(self, event):
        await self.send_json({"type": "tire", "data": event["data"]})

    async def alert_update(self, event):
        await self.send_json({"type": "alert", "data": event["data"]})

    async def strategy_update(self, event):
        await self.send_json({"type": "strategy", "kind": "pit", "data": event["data"]})

    async def tire_strategy_update(self, event):
        await self.send_json({"type": "strategy", "kind": "tire", "data": event["data"]})

    async def fuel_strategy_update(self, event):
        await self.send_json({"type": "strategy", "kind": "fuel", "data": event["data"]})
