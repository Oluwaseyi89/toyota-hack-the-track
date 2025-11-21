from rest_framework import serializers
from .models import PitStrategy, TireStrategy, FuelStrategy

class PitStrategySerializer(serializers.ModelSerializer):
    class Meta:
        model = PitStrategy
        fields = '__all__'

class TireStrategySerializer(serializers.ModelSerializer):
    class Meta:
        model = TireStrategy
        fields = '__all__'

class FuelStrategySerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelStrategy
        fields = '__all__'

class StrategyPredictionSerializer(serializers.Serializer):
    pit_strategy = PitStrategySerializer()
    tire_strategy = TireStrategySerializer()
    fuel_strategy = FuelStrategySerializer()
    timestamp = serializers.DateTimeField()