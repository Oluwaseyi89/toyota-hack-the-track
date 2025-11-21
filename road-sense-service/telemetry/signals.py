from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import TelemetryData, WeatherData, TireTelemetry
from strategy.tasks import update_strategy_predictions
from alerts.tasks import check_alert_conditions
from analytics.tasks import generate_performance_analytics

@receiver(post_save, sender=TelemetryData)
def handle_new_telemetry(sender, instance, created, **kwargs):
    """
    Signal handler for new telemetry data
    - Broadcast via WebSocket
    - Trigger strategy updates
    - Check alert conditions
    """
    if created:
        # Don't block the main thread - use transaction.on_commit
        transaction.on_commit(lambda: _process_new_telemetry(instance))

@receiver(post_save, sender=WeatherData)
def handle_weather_update(sender, instance, created, **kwargs):
    """
    Signal handler for weather data updates
    - Broadcast via WebSocket
    - Trigger strategy recalculations
    """
    if created:
        transaction.on_commit(lambda: _process_weather_update(instance))

@receiver(post_save, sender=TireTelemetry)
def handle_tire_telemetry(sender, instance, created, **kwargs):
    """
    Signal handler for tire telemetry data
    - Update tire degradation models
    - Check tire-specific alerts
    """
    if created:
        transaction.on_commit(lambda: _process_tire_telemetry(instance))

@receiver(post_delete, sender=TelemetryData)
def handle_telemetry_deletion(sender, instance, **kwargs):
    """
    Signal handler for telemetry data deletion
    - Clean up related data
    - Update analytics cache
    """
    transaction.on_commit(lambda: _cleanup_after_telemetry_deletion(instance))

def _process_new_telemetry(telemetry):
    """
    Process new telemetry data asynchronously
    """
    try:
        # Broadcast via WebSocket
        channel_layer = get_channel_layer()
        
        # Prepare telemetry data for broadcasting
        telemetry_data = {
            'vehicle_id': telemetry.vehicle.vehicle_id,
            'lap_number': telemetry.lap_number,
            'lap_time': telemetry.lap_time.total_seconds(),
            'speed': telemetry.speed,
            'position': telemetry.position,
            'gap_to_leader': telemetry.gap_to_leader,
            'rpm': telemetry.rpm,
            'gear': telemetry.gear,
            'throttle': telemetry.throttle,
            'brake': telemetry.brake,
            'timestamp': telemetry.timestamp.isoformat()
        }
        
        # Broadcast to telemetry group
        async_to_sync(channel_layer.group_send)(
            'telemetry_updates',
            {
                'type': 'telemetry.update',
                'data': telemetry_data
            }
        )
        
        # Trigger strategy updates
        update_strategy_predictions.delay()
        
        # Check alert conditions
        check_alert_conditions.delay()
        
        # Generate analytics for important laps
        if telemetry.lap_number % 5 == 0:  # Every 5 laps
            generate_performance_analytics.delay()
            
        print(f"Processed new telemetry for vehicle {telemetry.vehicle.vehicle_id}, lap {telemetry.lap_number}")
        
    except Exception as e:
        print(f"Error processing new telemetry: {e}")

def _process_weather_update(weather_data):
    """
    Process new weather data
    """
    try:
        channel_layer = get_channel_layer()
        
        # Prepare weather data for broadcasting
        weather_update = {
            'track_temperature': weather_data.track_temperature,
            'air_temperature': weather_data.air_temperature,
            'humidity': weather_data.humidity,
            'pressure': weather_data.pressure,
            'wind_speed': weather_data.wind_speed,
            'wind_direction': weather_data.wind_direction,
            'rainfall': weather_data.rainfall,
            'timestamp': weather_data.timestamp.isoformat()
        }
        
        # Broadcast to weather group
        async_to_sync(channel_layer.group_send)(
            'weather_updates',
            {
                'type': 'weather.update',
                'data': weather_update
            }
        )
        
        # Trigger strategy recalculations due to weather change
        update_strategy_predictions.delay()
        
        print(f"Processed new weather data: {weather_data.track_temperature}°C track, {weather_data.air_temperature}°C air")
        
    except Exception as e:
        print(f"Error processing weather update: {e}")

def _process_tire_telemetry(tire_data):
    """
    Process new tire telemetry data
    """
    try:
        # Prepare tire data for analysis
        tire_analysis = {
            'vehicle_id': tire_data.telemetry.vehicle.vehicle_id,
            'lap_number': tire_data.telemetry.lap_number,
            'front_left_temp': tire_data.front_left_temp,
            'front_right_temp': tire_data.front_right_temp,
            'rear_left_temp': tire_data.rear_left_temp,
            'rear_right_temp': tire_data.rear_right_temp,
            'front_left_pressure': tire_data.front_left_pressure,
            'front_right_pressure': tire_data.front_right_pressure,
            'rear_left_pressure': tire_data.rear_left_pressure,
            'rear_right_pressure': tire_data.rear_right_pressure,
            'timestamp': tire_data.telemetry.timestamp.isoformat()
        }
        
        # Broadcast tire data
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'tire_updates',
            {
                'type': 'tire.update',
                'data': tire_analysis
            }
        )
        
        # Check for tire-specific alerts
        _check_tire_alerts(tire_data)
        
        print(f"Processed tire telemetry for vehicle {tire_data.telemetry.vehicle.vehicle_id}")
        
    except Exception as e:
        print(f"Error processing tire telemetry: {e}")

def _check_tire_alerts(tire_data):
    """
    Check for tire-related alert conditions
    """
    try:
        from alerts.models import Alert
        
        alerts = []
        
        # Check temperature differentials
        temp_diff_front = abs(tire_data.front_left_temp - tire_data.front_right_temp)
        if temp_diff_front > 15:  # 15°C difference threshold
            alerts.append({
                'vehicle': tire_data.telemetry.vehicle,
                'alert_type': 'TIRE_WEAR',
                'severity': 'MEDIUM',
                'title': 'Uneven Front Tire Temperatures',
                'message': f'Front tire temperature difference: {temp_diff_front:.1f}°C',
                'recommended_action': 'Check tire pressures and suspension setup',
                'triggered_by': {
                    'temperature_difference': temp_diff_front,
                    'front_left_temp': tire_data.front_left_temp,
                    'front_right_temp': tire_data.front_right_temp
                }
            })
        
        # Check for overheating tires
        if tire_data.front_left_temp > 110 or tire_data.front_right_temp > 110:
            alerts.append({
                'vehicle': tire_data.telemetry.vehicle,
                'alert_type': 'TIRE_WEAR',
                'severity': 'HIGH',
                'title': 'High Tire Temperatures',
                'message': f'Tire temperatures exceeding optimal range (>{110}°C)',
                'recommended_action': 'Consider reducing pace or adjusting setup',
                'triggered_by': {
                    'front_left_temp': tire_data.front_left_temp,
                    'front_right_temp': tire_data.front_right_temp
                }
            })
        
        # Check pressure anomalies
        pressure_diff_front = abs(tire_data.front_left_pressure - tire_data.front_right_pressure)
        if pressure_diff_front > 1.0:  # 1.0 PSI difference threshold
            alerts.append({
                'vehicle': tire_data.telemetry.vehicle,
                'alert_type': 'SYSTEM_WARNING',
                'severity': 'MEDIUM',
                'title': 'Uneven Tire Pressures',
                'message': f'Front tire pressure difference: {pressure_diff_front:.1f} PSI',
                'recommended_action': 'Check for leaks and adjust pressures',
                'triggered_by': {
                    'pressure_difference': pressure_diff_front,
                    'front_left_pressure': tire_data.front_left_pressure,
                    'front_right_pressure': tire_data.front_right_pressure
                }
            })
        
        # Create alerts
        for alert_data in alerts:
            Alert.objects.create(**alert_data)
            
    except Exception as e:
        print(f"Error checking tire alerts: {e}")

def _cleanup_after_telemetry_deletion(telemetry):
    """
    Clean up after telemetry data deletion
    """
    try:
        # Delete related tire telemetry if it exists
        try:
            tire_telemetry = TireTelemetry.objects.get(telemetry=telemetry)
            tire_telemetry.delete()
        except TireTelemetry.DoesNotExist:
            pass
        
        # Update analytics cache or summary data
        _update_analytics_cache(telemetry.vehicle)
        
        print(f"Cleaned up after deletion of telemetry for vehicle {telemetry.vehicle.vehicle_id}, lap {telemetry.lap_number}")
        
    except Exception as e:
        print(f"Error cleaning up after telemetry deletion: {e}")

def _update_analytics_cache(vehicle):
    """
    Update analytics cache for a vehicle
    """
    try:
        from analytics.models import PerformanceAnalysis
        
        # Get recent performance analyses for this vehicle
        recent_analyses = PerformanceAnalysis.objects.filter(
            vehicle=vehicle
        ).order_by('-analysis_timestamp')[:5]
        
        # Update cache or summary data here
        # This could update a cached summary of vehicle performance
        
        print(f"Updated analytics cache for vehicle {vehicle.vehicle_id}")
        
    except Exception as e:
        print(f"Error updating analytics cache: {e}")

# Signal for bulk telemetry updates
@receiver(post_save, sender=TelemetryData)
def handle_bulk_telemetry_updates(sender, instance, created, **kwargs):
    """
    Handle bulk telemetry updates efficiently
    """
    if created and instance.lap_number % 10 == 0:  # Every 10 laps
        transaction.on_commit(lambda: _process_bulk_update(instance))

def _process_bulk_update(telemetry):
    """
    Process bulk updates for efficiency
    """
    try:
        # Update comprehensive analytics
        from analytics.tasks import update_competitor_analysis
        update_competitor_analysis.delay()
        
        # Run batch simulations if this is a key lap
        if telemetry.lap_number % 20 == 0:  # Every 20 laps
            from analytics.tasks import run_batch_simulations
            run_batch_simulations.delay(3)  # Run 3 simulations
            
        print(f"Processed bulk update for lap {telemetry.lap_number}")
        
    except Exception as e:
        print(f"Error processing bulk update: {e}")