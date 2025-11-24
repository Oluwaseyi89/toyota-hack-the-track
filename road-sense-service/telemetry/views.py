from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import TelemetryData, Vehicle, WeatherData
from .serializers import (
    TelemetryDataSerializer, VehicleSerializer, 
    WeatherDataSerializer, LiveTelemetrySerializer
)
from utils.data_processors import TelemetryProcessor
from accounts.permissions import CanAccessLiveData


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer

class TelemetryDataViewSet(viewsets.ModelViewSet):
    queryset = TelemetryData.objects.all().order_by('-timestamp')
    serializer_class = TelemetryDataSerializer  # Add this line
    permission_classes = [CanAccessLiveData]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by user's preferred vehicle if set
        if self.request.user.is_authenticated and self.request.user.preferred_vehicle:
            queryset = queryset.filter(vehicle=self.request.user.preferred_vehicle)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current telemetry - user-specific based on preferences"""
        # Use user's preferred vehicle or show all
        if request.user.is_authenticated and request.user.preferred_vehicle:
            recent_telemetry = TelemetryData.objects.filter(
                vehicle=request.user.preferred_vehicle,
                timestamp__gte=timezone.now() - timedelta(seconds=10)
            )
        else:
            recent_telemetry = TelemetryData.objects.filter(
                timestamp__gte=timezone.now() - timedelta(seconds=10)
            )
        
        serializer = self.get_serializer(recent_telemetry, many=True)
        return Response({
            'user_preferences': getattr(request, 'user_preferences', {}),
            'data': serializer.data
        })

        
class WeatherDataViewSet(viewsets.ModelViewSet):
    queryset = WeatherData.objects.all().order_by('-timestamp')
    serializer_class = WeatherDataSerializer
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current weather conditions"""
        current_weather = WeatherData.objects.last()
        if current_weather:
            serializer = self.get_serializer(current_weather)
            return Response(serializer.data)
        return Response({'error': 'No weather data available'})
