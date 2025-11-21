from django.db import models
from telemetry.models import Vehicle

class Alert(models.Model):
    ALERT_TYPES = [
        ('TIRE_WEAR', 'Tire Wear'),
        ('FUEL_LOW', 'Low Fuel'),
        ('WEATHER_CHANGE', 'Weather Change'),
        ('STRATEGY_OPPORTUNITY', 'Strategy Opportunity'),
        ('COMPETITOR_THREAT', 'Competitor Threat'),
        ('SYSTEM_WARNING', 'System Warning'),
    ]
    
    ALERT_SEVERITY = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, null=True, blank=True)
    alert_type = models.CharField(max_length=50, choices=ALERT_TYPES)
    severity = models.CharField(max_length=20, choices=ALERT_SEVERITY)
    title = models.CharField(max_length=200)
    message = models.TextField()
    recommended_action = models.TextField(blank=True)
    triggered_by = models.JSONField()  # Store what triggered this alert
    is_active = models.BooleanField(default=True)
    is_acknowledged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)

class AlertRule(models.Model):
    name = models.CharField(max_length=100)
    alert_type = models.CharField(max_length=50, choices=Alert.ALERT_TYPES)
    condition = models.JSONField()  # Store condition logic
    severity = models.CharField(max_length=20, choices=Alert.ALERT_SEVERITY)
    message_template = models.TextField()
    action_template = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)