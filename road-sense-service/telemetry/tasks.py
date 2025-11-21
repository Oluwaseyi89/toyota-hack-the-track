from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import TelemetryData, WeatherData
from utils.data_processors import TelemetryProcessor, WeatherProcessor
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@shared_task
def process_live_telemetry():
    """Process incoming telemetry data and broadcast via WebSocket"""
    try:
        channel_layer = get_channel_layer()
        processor = TelemetryProcessor()
        
        # Get latest telemetry data
        recent_telemetry = processor.get_latest_telemetry()
        
        # Broadcast to WebSocket clients
        async_to_sync(channel_layer.group_send)(
            'telemetry_updates',
            {
                'type': 'telemetry_update',
                'data': recent_telemetry
            }
        )
        
        return f"Processed {len(recent_telemetry)} telemetry records"
        
    except Exception as e:
        return f"Error processing telemetry: {str(e)}"

@shared_task
def ingest_external_telemetry(source_url=None):
    """Ingest telemetry data from external sources"""
    try:
        processor = TelemetryProcessor()
        
        # This would connect to external APIs in production
        # For now, we'll simulate external data
        if not source_url:
            # Generate simulated external data
            external_data = {
                'vehicle_id': 'GR86-001-000',
                'car_number': 1,
                'team': 'Toyota GR Team 1',
                'driver': 'Demo Driver 1',
                'lap_number': TelemetryData.objects.filter(vehicle__number=1).count() + 1,
                'lap_time': 85.0 + (TelemetryData.objects.count() % 10) * 0.1,
                'speed': 180 + (TelemetryData.objects.count() % 20),
                'rpm': 12000,
                'gear': 5,
                'throttle': 95.0,
                'brake': 5.0,
                'position': 1,
                'gap_to_leader': 0.0
            }
            
            result = processor.process_external_telemetry(external_data)
            if result:
                return f"Ingested telemetry for vehicle {external_data['vehicle_id']}"
        
        return "No external telemetry to process"
        
    except Exception as e:
        return f"Error ingesting external telemetry: {str(e)}"

@shared_task
def cleanup_old_telemetry(hours_old=24):
    """Clean up telemetry data older than specified hours"""
    try:
        cutoff_time = timezone.now() - timedelta(hours=hours_old)
        deleted_count, _ = TelemetryData.objects.filter(
            timestamp__lt=cutoff_time
        ).delete()
        
        return f"Cleaned up {deleted_count} old telemetry records"
        
    except Exception as e:
        return f"Error cleaning up telemetry: {str(e)}"

@shared_task
def update_weather_data():
    """Update weather data from external sources"""
    try:
        weather_processor = WeatherProcessor()
        weather_data = weather_processor.generate_simulated_weather()
        weather_data.save()
        
        # Broadcast weather update
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'weather_updates',
            {
                'type': 'weather_update',
                'data': {
                    'track_temperature': weather_data.track_temperature,
                    'air_temperature': weather_data.air_temperature,
                    'humidity': weather_data.humidity,
                    'rainfall': weather_data.rainfall
                }
            }
        )
        
        return "Weather data updated successfully"
        
    except Exception as e:
        return f"Error updating weather data: {str(e)}"