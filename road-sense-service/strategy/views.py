from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import PitStrategy, TireStrategy, FuelStrategy
from .serializers import (
    PitStrategySerializer, TireStrategySerializer, 
    FuelStrategySerializer, StrategyPredictionSerializer
)
from .ml_integration import StrategyMLModels
from telemetry.models import TelemetryData, Vehicle

class PitStrategyViewSet(viewsets.ModelViewSet):
    queryset = PitStrategy.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = PitStrategySerializer
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current pit strategy recommendations"""
        ml_models = StrategyMLModels()
        
        # Get latest telemetry data
        latest_telemetry = TelemetryData.objects.all().order_by('-timestamp').first()
        
        if not latest_telemetry:
            return Response({'error': 'No telemetry data available'})
        
        # Predict pit strategy using ML model
        race_data = self._prepare_race_data(latest_telemetry)
        strategy, confidence = ml_models.predict_pit_strategy(race_data)
        
        # Create or update strategy recommendation
        strategy_obj, created = PitStrategy.objects.update_or_create(
            vehicle=latest_telemetry.vehicle,
            is_active=True,
            defaults={
                'recommended_lap': race_data.get('current_lap', 0) + 10,
                'confidence': confidence,
                'strategy_type': strategy,
                'reasoning': f"ML model recommendation based on current race conditions"
            }
        )
        
        serializer = self.get_serializer(strategy_obj)
        return Response(serializer.data)
    
    def _prepare_race_data(self, telemetry):
        """Prepare race data for ML model prediction"""
        return {
            'current_lap': telemetry.lap_number,
            'position': telemetry.position,
            'gap_to_leader': telemetry.gap_to_leader,
            'tire_degradation': 0.1,  # This would come from tire model
            'fuel_remaining': 50.0,   # This would come from fuel calculations
        }

class TireStrategyViewSet(viewsets.ModelViewSet):
    queryset = TireStrategy.objects.all().order_by('-created_at')
    serializer_class = TireStrategySerializer
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current tire strategy"""
        ml_models = StrategyMLModels()
        
        # Get latest telemetry
        latest_telemetry = TelemetryData.objects.all().order_by('-timestamp').first()
        
        if not latest_telemetry:
            return Response({'error': 'No telemetry data available'})
        
        # Predict tire degradation
        tire_prediction = ml_models.predict_tire_degradation(latest_telemetry)
        
        # Create tire strategy
        strategy_obj = TireStrategy.objects.create(
            vehicle=latest_telemetry.vehicle,
            predicted_laps_remaining=tire_prediction.get('predicted_laps_remaining', 15),
            degradation_rate=tire_prediction.get('grip_loss_rate', 0.1),
            optimal_change_lap=latest_telemetry.lap_number + 10,
            confidence=0.8
        )
        
        serializer = self.get_serializer(strategy_obj)
        return Response(serializer.data)

class StrategyPredictionViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def comprehensive(self, request):
        """Get comprehensive strategy prediction"""
        ml_models = StrategyMLModels()
        
        # Get all current strategies
        pit_strategy = PitStrategy.objects.filter(is_active=True).first()
        tire_strategy = TireStrategy.objects.all().order_by('-created_at').first()
        fuel_strategy = FuelStrategy.objects.all().order_by('-created_at').first()
        
        # If no strategies exist, generate them
        if not pit_strategy:
            pit_view = PitStrategyViewSet()
            pit_response = pit_view.current(request)
            pit_strategy = PitStrategy.objects.filter(is_active=True).first()
        
        prediction_data = {
            'pit_strategy': pit_strategy,
            'tire_strategy': tire_strategy,
            'fuel_strategy': fuel_strategy,
            'timestamp': timezone.now()
        }
        
        serializer = StrategyPredictionSerializer(prediction_data)
        return Response(serializer.data)