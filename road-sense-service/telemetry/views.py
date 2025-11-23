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




# class TelemetryDataViewSet(viewsets.ModelViewSet):
#     queryset = TelemetryData.objects.all().order_by('-timestamp')
#     serializer_class = TelemetryDataSerializer
    
#     @action(detail=False, methods=['get'])
#     def current(self, request):
#         """Get current telemetry for all vehicles"""
#         recent_time = timezone.now() - timedelta(seconds=10)
#         recent_telemetry = TelemetryData.objects.filter(
#             timestamp__gte=recent_time
#         ).select_related('vehicle', 'tiretelemetry')
        
#         serializer = self.get_serializer(recent_telemetry, many=True)
#         return Response(serializer.data)
    
#     @action(detail=False, methods=['get'])
#     def vehicle(self, request, vehicle_number=None):
#         """Get telemetry for specific vehicle"""
#         try:
#             vehicle = Vehicle.objects.get(number=vehicle_number)
#             recent_telemetry = TelemetryData.objects.filter(
#                 vehicle=vehicle
#             ).order_by('-timestamp')[:50]  # Last 50 records
            
#             serializer = self.get_serializer(recent_telemetry, many=True)
#             return Response(serializer.data)
#         except Vehicle.DoesNotExist:
#             return Response(
#                 {'error': 'Vehicle not found'}, 
#                 status=status.HTTP_404_NOT_FOUND
#             )
    
#     @action(detail=False, methods=['post'])
#     def simulate(self, request):
#         """Simulate telemetry data for testing"""
#         processor = TelemetryProcessor()
#         simulated_data = processor.generate_simulated_telemetry()
        
#         # Save simulated data
#         for data in simulated_data:
#             serializer = self.get_serializer(data=data)
#             if serializer.is_valid():
#                 serializer.save()
        
#         return Response({
#             'message': f'Generated {len(simulated_data)} telemetry records',
#             'data': simulated_data
#         })



class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer

# class TelemetryDataViewSet(viewsets.ModelViewSet):
#     queryset = TelemetryData.objects.all().order_by('-timestamp')
#     serializer_class = TelemetryDataSerializer
    
#     @action(detail=False, methods=['get'])
#     def current(self, request):
#         """Get current telemetry for all vehicles"""
#         recent_time = timezone.now() - timedelta(seconds=10)
#         recent_telemetry = TelemetryData.objects.filter(
#             timestamp__gte=recent_time
#         ).select_related('vehicle', 'tiretelemetry')
        
#         serializer = self.get_serializer(recent_telemetry, many=True)
#         return Response(serializer.data)
    
#     @action(detail=False, methods=['get'])
#     def vehicle(self, request):
#         """Get telemetry for specific vehicle - FIXED PARAMETER"""
#         vehicle_number = request.query_params.get('vehicle_number')
        
#         if not vehicle_number:
#             return Response(
#                 {'error': 'vehicle_number parameter is required'}, 
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         try:
#             vehicle = Vehicle.objects.get(number=vehicle_number)
#             recent_telemetry = TelemetryData.objects.filter(
#                 vehicle=vehicle
#             ).order_by('-timestamp')[:50]
            
#             serializer = self.get_serializer(recent_telemetry, many=True)
#             return Response(serializer.data)
#         except Vehicle.DoesNotExist:
#             return Response(
#                 {'error': 'Vehicle not found'}, 
#                 status=status.HTTP_404_NOT_FOUND
#             )
    
#     @action(detail=False, methods=['post'])
#     def simulate(self, request):
#         """Simulate telemetry data for testing"""
#         processor = TelemetryProcessor()
#         simulated_data = processor.generate_simulated_telemetry()
        
#         # Save simulated data
#         saved_count = 0
#         for data in simulated_data:
#             if isinstance(data, TelemetryData):
#                 data.save()
#                 saved_count += 1
        
#         return Response({
#             'message': f'Generated {saved_count} telemetry records',
#             'count': saved_count
#         })


class TelemetryDataViewSet(viewsets.ModelViewSet):
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
