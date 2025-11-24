from celery import shared_task
from django.utils import timezone
from .models import Alert, AlertRule
from telemetry.models import TelemetryData
from strategy.ml_integration import StrategyMLModels
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from datetime import timedelta

@shared_task
def check_alert_conditions():
    """Check all alert conditions and generate new alerts"""
    try:
        ml_models = StrategyMLModels()
        new_alerts = []
        
        # Get latest telemetry data
        latest_telemetry = TelemetryData.objects.all().order_by('-timestamp').first()
        
        if not latest_telemetry:
            return "No telemetry data available for alert checking"
        
        # Check all active alert rules
        active_rules = AlertRule.objects.filter(is_active=True)
        
        for rule in active_rules:
            alerts = _evaluate_alert_rule(rule, latest_telemetry, ml_models)
            new_alerts.extend(alerts)
        
        # Save new alerts
        saved_count = 0
        for alert_data in new_alerts:
            alert = Alert.objects.create(**alert_data)
            saved_count += 1
            
            # Broadcast alert via WebSocket
            _broadcast_alert(alert)
        
        return f"Generated {saved_count} new alerts"
        
    except Exception as e:
        return f"Error checking alert conditions: {str(e)}"

@shared_task
def cleanup_old_alerts(days_old=7):
    """Clean up old alerts that are no longer active"""
    try:
        cutoff_time = timezone.now() - timedelta(days=days_old)
        deleted_count, _ = Alert.objects.filter(
            created_at__lt=cutoff_time,
            is_active=False
        ).delete()
        
        return f"Cleaned up {deleted_count} old alerts"
        
    except Exception as e:
        return f"Error cleaning up alerts: {str(e)}"

@shared_task
def acknowledge_stale_alerts(hours_old=2):
    """Automatically acknowledge alerts that have been active for too long"""
    try:
        cutoff_time = timezone.now() - timedelta(hours=hours_old)
        stale_alerts = Alert.objects.filter(
            is_active=True,
            is_acknowledged=False,
            created_at__lt=cutoff_time
        )
        
        updated_count = stale_alerts.update(
            is_acknowledged=True,
            acknowledged_at=timezone.now()
        )
        
        return f"Auto-acknowledged {updated_count} stale alerts"
        
    except Exception as e:
        return f"Error acknowledging stale alerts: {str(e)}"

def _evaluate_alert_rule(rule, telemetry, ml_models):
    """Evaluate a single alert rule against current telemetry"""
    alerts = []
    
    if rule.alert_type == 'TIRE_WEAR':
        # Check tire wear conditions using ML model
        tire_prediction = ml_models.predict_tire_degradation(telemetry)
        if tire_prediction.get('grip_loss_rate', 0) > 0.12:
            alerts.append({
                'vehicle': telemetry.vehicle,
                'alert_type': 'TIRE_WEAR',
                'severity': rule.severity,
                'title': 'High Tire Degradation',
                'message': rule.message_template.format(
                    degradation_rate=tire_prediction['grip_loss_rate']
                ),
                'recommended_action': rule.action_template,
                'triggered_by': {
                    'grip_loss_rate': tire_prediction['grip_loss_rate'],
                    'rule_id': rule.id
                }
            })
    
    elif rule.alert_type == 'FUEL_LOW':
        # Check fuel conditions (simulated)
        predicted_laps_remaining = 20 - (telemetry.lap_number % 20)
        if predicted_laps_remaining < 8:
            alerts.append({
                'vehicle': telemetry.vehicle,
                'alert_type': 'FUEL_LOW',
                'severity': rule.severity,
                'title': 'Low Fuel Warning',
                'message': rule.message_template.format(
                    laps_remaining=predicted_laps_remaining
                ),
                'recommended_action': rule.action_template,
                'triggered_by': {
                    'laps_remaining': predicted_laps_remaining,
                    'rule_id': rule.id
                }
            })
    
    elif rule.alert_type == 'STRATEGY_OPPORTUNITY':
        # Check for strategy opportunities
        if telemetry.position in [2, 3, 4] and telemetry.gap_to_leader < 5.0:
            alerts.append({
                'vehicle': telemetry.vehicle,
                'alert_type': 'STRATEGY_OPPORTUNITY',
                'severity': rule.severity,
                'title': 'Strategy Opportunity',
                'message': rule.message_template.format(
                    position=telemetry.position,
                    gap=telemetry.gap_to_leader
                ),
                'recommended_action': rule.action_template,
                'triggered_by': {
                    'position': telemetry.position,
                    'gap_to_leader': telemetry.gap_to_leader,
                    'rule_id': rule.id
                }
            })
    
    return alerts

def _broadcast_alert(alert):
    """Broadcast alert to WebSocket clients"""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'alert_updates',
            {
                'type': 'alert_update',
                'data': {
                    'id': alert.id,
                    'type': alert.alert_type,
                    'severity': alert.severity,
                    'title': alert.title,
                    'message': alert.message,
                    'action': alert.recommended_action,
                    'timestamp': alert.created_at.isoformat()
                }
            }
        )
    except Exception as e:
        print(f"Error broadcasting alert: {e}")