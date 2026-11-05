from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import PerformanceAnalysis, RaceSimulation, CompetitorAnalysis
from .serializers import (
    PerformanceAnalysisSerializer, RaceSimulationSerializer,
    CompetitorAnalysisSerializer, AnalyticsSummarySerializer
)
from telemetry.models import Vehicle
from strategy.services import latest_telemetry_for
from accounts.permissions import CanModifyStrategy
from .services import analyze_vehicle_performance, run_and_store_simulation


def _focus_telemetry(request):
    """Latest lap for the user's preferred car, else the most recent car."""
    preferred = getattr(request.user, 'preferred_vehicle', None)
    return latest_telemetry_for(preferred) or latest_telemetry_for()

class PerformanceAnalysisViewSet(viewsets.ModelViewSet):
    queryset = PerformanceAnalysis.objects.all().order_by('-analysis_timestamp')
    serializer_class = PerformanceAnalysisSerializer
    permission_classes = [CanModifyStrategy]
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Performance analysis of the focus car, computed from its laps."""
        telemetry = _focus_telemetry(request)
        if not telemetry:
            return Response({'error': 'No telemetry data available'})
        analysis = analyze_vehicle_performance(telemetry)
        return Response(self.get_serializer(analysis).data)


class RaceSimulationViewSet(viewsets.ModelViewSet):
    queryset = RaceSimulation.objects.all().order_by('-created_at')
    serializer_class = RaceSimulationSerializer
    permission_classes = [CanModifyStrategy]
    
    @action(detail=False, methods=['post'])
    def simulate(self, request):
        """
        Monte Carlo strategy simulation for the focus car (or `vehicle_id` in
        parameters) using its measured pace and degradation.
        """
        parameters = request.data.get('parameters', {}) or {}
        telemetry = None
        if parameters.get('vehicle_id'):
            vehicle = Vehicle.objects.filter(vehicle_id=parameters['vehicle_id']).first()
            telemetry = latest_telemetry_for(vehicle) if vehicle else None
        telemetry = telemetry or _focus_telemetry(request)
        if not telemetry:
            return Response({'error': 'No telemetry data available'}, status=status.HTTP_400_BAD_REQUEST)

        simulation = run_and_store_simulation(telemetry, parameters)
        return Response(self.get_serializer(simulation).data)


class AnalyticsSummaryViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get comprehensive analytics summary for dashboard"""
        # Get recent performance analyses
        recent_analyses = PerformanceAnalysis.objects.all().order_by('-analysis_timestamp')[:10]
        
        # Get competitor analyses (handle if model doesn't exist)
        competitor_analyses = CompetitorAnalysis.objects.all().order_by('-analysis_timestamp')[:5]
        
        # Get recent simulations
        recent_simulations = RaceSimulation.objects.filter(is_completed=True).order_by('-created_at')[:3]
        
        summary_data = {
            'performance_analysis': recent_analyses,
            'competitor_analysis': competitor_analyses,
            'simulation_results': recent_simulations,
            'timestamp': timezone.now()
        }
        
        serializer = AnalyticsSummarySerializer(summary_data)
        return Response(serializer.data)