from django.db import models
from telemetry.models import Vehicle

class PerformanceAnalysis(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    lap_number = models.IntegerField()
    sector_times = models.JSONField()  # Store sector times as JSON
    tire_degradation_impact = models.FloatField()
    fuel_impact = models.FloatField()
    weather_impact = models.FloatField()
    predicted_lap_time = models.FloatField()
    actual_lap_time = models.FloatField(null=True, blank=True)
    analysis_timestamp = models.DateTimeField(auto_now_add=True)

class RaceSimulation(models.Model):
    simulation_id = models.CharField(max_length=100, unique=True)
    parameters = models.JSONField()
    results = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_completed = models.BooleanField(default=False)

class CompetitorAnalysis(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    lap_number = models.IntegerField()
    competitor_data = models.JSONField()  # Store competitor positions, gaps, etc.
    threat_level = models.CharField(max_length=20, choices=[
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High')
    ])
    analysis_timestamp = models.DateTimeField(auto_now_add=True)