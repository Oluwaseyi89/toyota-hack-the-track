from rest_framework import serializers
from .models import TelemetryData, Vehicle, TireTelemetry, WeatherData

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'

class TireTelemetrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TireTelemetry
        fields = '__all__'

class TelemetryDataSerializer(serializers.ModelSerializer):
    vehicle = VehicleSerializer(read_only=True)
    tire_data = TireTelemetrySerializer(source='tiretelemetry', read_only=True)
    lap_time_seconds = serializers.SerializerMethodField()
    
    class Meta:
        model = TelemetryData
        fields = '__all__'
    
    def get_lap_time_seconds(self, obj):
        return obj.lap_time.total_seconds()

class WeatherDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeatherData
        fields = '__all__'

class LiveTelemetrySerializer(serializers.Serializer):
    vehicle_id = serializers.CharField()
    lap_number = serializers.IntegerField()
    lap_time = serializers.FloatField()
    speed = serializers.FloatField()
    position = serializers.IntegerField()
    gap_to_leader = serializers.FloatField()
    timestamp = serializers.DateTimeField()