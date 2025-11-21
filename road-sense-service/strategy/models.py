from django.db import models
from telemetry.models import Vehicle

class PitStrategy(models.Model):
    STRATEGY_TYPES = [
        ('EARLY', 'Early Stop'),
        ('MIDDLE', 'Middle Stop'),
        ('LATE', 'Late Stop'),
        ('UNDERCUT', 'Undercut'),
        ('OVERCUT', 'Overcut'),
    ]
    
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    recommended_lap = models.IntegerField()
    confidence = models.FloatField()
    strategy_type = models.CharField(max_length=20, choices=STRATEGY_TYPES)
    reasoning = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

class TireStrategy(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    predicted_laps_remaining = models.IntegerField()
    degradation_rate = models.FloatField()
    optimal_change_lap = models.IntegerField()
    confidence = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

class FuelStrategy(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    current_fuel = models.FloatField()
    predicted_laps_remaining = models.IntegerField()
    consumption_rate = models.FloatField()
    need_to_conserve = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)