import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class TelemetryConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Add connection to groups for different types of updates
        await self.channel_layer.group_add(
            "telemetry_updates",
            self.channel_name
        )
        await self.channel_layer.group_add(
            "weather_updates", 
            self.channel_name
        )
        await self.channel_layer.group_add(
            "tire_updates",
            self.channel_name
        )
        await self.channel_layer.group_add(
            "alert_updates",
            self.channel_name
        )
        
        await self.accept()
        await self.send(json.dumps({
            'type': 'connection_established',
            'message': 'WebSocket connected to all update groups'
        }))

    async def disconnect(self, close_code):
        # Remove from all groups
        await self.channel_layer.group_discard(
            "telemetry_updates",
            self.channel_name
        )
        await self.channel_layer.group_discard(
            "weather_updates",
            self.channel_name
        )
        await self.channel_layer.group_discard(
            "tire_updates",
            self.channel_name
        )
        await self.channel_layer.group_discard(
            "alert_updates",
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'subscribe_telemetry':
            await self.handle_telemetry_subscription()
        elif message_type == 'request_current_data':
            await self.send_current_data()

    # Add these new handler methods for different update types
    async def telemetry_update(self, event):
        """Handle telemetry updates from signals"""
        await self.send(text_data=json.dumps({
            'type': 'telemetry',
            'data': event['data']
        }))

    async def weather_update(self, event):
        """Handle weather updates from signals"""
        await self.send(text_data=json.dumps({
            'type': 'weather',
            'data': event['data']
        }))

    async def tire_update(self, event):
        """Handle tire updates from signals"""
        await self.send(text_data=json.dumps({
            'type': 'tire',
            'data': event['data']
        }))

    async def alert_update(self, event):
        """Handle alert updates from signals"""
        await self.send(text_data=json.dumps({
            'type': 'alert',
            'data': event['data']
        }))

    async def handle_telemetry_subscription(self):
        """Handle telemetry data subscription"""
        # Initial data can be sent here
        from utils.data_processors import TelemetryProcessor
        processor = TelemetryProcessor()
        
        current_data = await database_sync_to_async(
            processor.get_latest_telemetry
        )()
        
        await self.send(json.dumps({
            'type': 'current_telemetry',
            'data': current_data
        }))

    async def send_current_data(self):
        """Send current data of all types"""
        from utils.data_processors import TelemetryProcessor, WeatherProcessor
        
        processor = TelemetryProcessor()
        weather_processor = WeatherProcessor()
        
        # Get current telemetry
        telemetry_data = await database_sync_to_async(
            processor.get_latest_telemetry
        )()
        
        # Get current weather
        from telemetry.models import WeatherData
        current_weather = await database_sync_to_async(
            lambda: WeatherData.objects.last()
        )()
        
        weather_data = {}
        if current_weather:
            weather_data = {
                'track_temperature': current_weather.track_temperature,
                'air_temperature': current_weather.air_temperature,
                'humidity': current_weather.humidity,
                'rainfall': current_weather.rainfall
            }
        
        await self.send(json.dumps({
            'type': 'current_data',
            'telemetry': telemetry_data,
            'weather': weather_data
        }))