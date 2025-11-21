from django.db import models
from django.contrib.auth.models import User

class Vehicle(models.Model):
    number = models.IntegerField(unique=True)
    team = models.CharField(max_length=100)
    driver = models.CharField(max_length=100)
    vehicle_id = models.CharField(max_length=50, unique=True)
    
    def __str__(self):
        return f"#{self.number} - {self.driver}"

class TelemetryData(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    lap_number = models.IntegerField()
    lap_time = models.DurationField()
    sector1_time = models.DurationField(null=True, blank=True)
    sector2_time = models.DurationField(null=True, blank=True)
    sector3_time = models.DurationField(null=True, blank=True)
    speed = models.FloatField(help_text="Speed in km/h")
    rpm = models.IntegerField()
    gear = models.IntegerField()
    throttle = models.FloatField(help_text="Throttle percentage")
    brake = models.FloatField(help_text="Brake percentage")
    position = models.IntegerField()
    gap_to_leader = models.FloatField(help_text="Gap in seconds")
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['vehicle', 'lap_number']),
            models.Index(fields=['timestamp']),
        ]

class TireTelemetry(models.Model):
    telemetry = models.OneToOneField(TelemetryData, on_delete=models.CASCADE)
    front_left_temp = models.FloatField(null=True, blank=True)
    front_right_temp = models.FloatField(null=True, blank=True)
    rear_left_temp = models.FloatField(null=True, blank=True)
    rear_right_temp = models.FloatField(null=True, blank=True)
    front_left_pressure = models.FloatField(null=True, blank=True)
    front_right_pressure = models.FloatField(null=True, blank=True)
    rear_left_pressure = models.FloatField(null=True, blank=True)
    rear_right_pressure = models.FloatField(null=True, blank=True)

class WeatherData(models.Model):
    track_temperature = models.FloatField()
    air_temperature = models.FloatField()
    humidity = models.FloatField()
    pressure = models.FloatField()
    wind_speed = models.FloatField()
    wind_direction = models.FloatField()
    rainfall = models.FloatField(default=0.0)
    timestamp = models.DateTimeField(auto_now_add=True)