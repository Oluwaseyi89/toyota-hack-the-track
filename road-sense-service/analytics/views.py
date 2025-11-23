# from rest_framework import viewsets, status
# from rest_framework.decorators import action
# from rest_framework.response import Response
# from django.utils import timezone
# from datetime import timedelta
# from .models import PerformanceAnalysis, RaceSimulation, CompetitorAnalysis
# from .serializers import (
#     PerformanceAnalysisSerializer, RaceSimulationSerializer,
#     CompetitorAnalysisSerializer, AnalyticsSummarySerializer
# )
# from telemetry.models import TelemetryData, Vehicle
# from strategy.ml_integration import StrategyMLModels

# class PerformanceAnalysisViewSet(viewsets.ModelViewSet):
#     queryset = PerformanceAnalysis.objects.all().order_by('-analysis_timestamp')
#     serializer_class = PerformanceAnalysisSerializer
    
#     @action(detail=False, methods=['get'])
#     def current(self, request):
#         """Get current performance analysis"""
#         ml_models = StrategyMLModels()
        
#         # Get latest telemetry data
#         latest_telemetry = TelemetryData.objects.all().order_by('-timestamp').first()
        
#         if not latest_telemetry:
#             return Response({'error': 'No telemetry data available'})
        
#         # Generate performance analysis using ML models
#         analysis_data = self._generate_performance_analysis(latest_telemetry, ml_models)
        
#         # Save analysis
#         analysis = PerformanceAnalysis.objects.create(
#             vehicle=latest_telemetry.vehicle,
#             lap_number=latest_telemetry.lap_number,
#             sector_times=analysis_data['sector_times'],
#             tire_degradation_impact=analysis_data['tire_impact'],
#             fuel_impact=analysis_data['fuel_impact'],
#             weather_impact=analysis_data['weather_impact'],
#             predicted_lap_time=analysis_data['predicted_time']
#         )
        
#         serializer = self.get_serializer(analysis)
#         return Response(serializer.data)
    
#     def _generate_performance_analysis(self, telemetry, ml_models):
#         """Generate performance analysis using ML models"""
#         # This would integrate with your trained models
#         return {
#             'sector_times': [telemetry.sector1_time, telemetry.sector2_time, telemetry.sector3_time],
#             'tire_impact': 0.15,  # From tire model
#             'fuel_impact': 0.05,  # From fuel model
#             'weather_impact': 0.08,  # From weather model
#             'predicted_time': telemetry.lap_time.total_seconds() + 0.28
#         }

# class RaceSimulationViewSet(viewsets.ModelViewSet):
#     queryset = RaceSimulation.objects.all().order_by('-created_at')
#     serializer_class = RaceSimulationSerializer
    
#     @action(detail=False, methods=['post'])
#     def simulate(self, request):
#         """Run race simulation with current data"""
#         parameters = request.data.get('parameters', {})
        
#         # Generate simulation ID
#         simulation_id = f"sim_{timezone.now().strftime('%Y%m%d_%H%M%S')}"
        
#         # Run simulation (this would use your ML models)
#         simulation_results = self._run_race_simulation(parameters)
        
#         # Save simulation
#         simulation = RaceSimulation.objects.create(
#             simulation_id=simulation_id,
#             parameters=parameters,
#             results=simulation_results,
#             is_completed=True
#         )
        
#         serializer = self.get_serializer(simulation)
#         return Response(serializer.data)
    
#     def _run_race_simulation(self, parameters):
#         """Run race simulation using ML models"""
#         # This would integrate with your trained models for predictive simulation
#         return {
#             'optimal_pit_lap': 22,
#             'predicted_finish_position': 3,
#             'expected_total_time': 45 * 60 + 32.15,  # 45 minutes 32.15 seconds
#             'tire_degradation_impact': 12.5,
#             'fuel_impact': 3.2,
#             'weather_impact': 5.1,
#             'confidence': 0.78
#         }

# class AnalyticsSummaryViewSet(viewsets.ViewSet):
#     @action(detail=False, methods=['get'])
#     def dashboard(self, request):
#         """Get comprehensive analytics summary for dashboard"""
#         # Get recent performance analyses
#         recent_analyses = PerformanceAnalysis.objects.all().order_by('-analysis_timestamp')[:10]
        
#         # Get competitor analyses
#         competitor_analyses = CompetitorAnalysis.objects.all().order_by('-analysis_timestamp')[:5]
        
#         # Get recent simulations
#         recent_simulations = RaceSimulation.objects.filter(is_completed=True).order_by('-created_at')[:3]
        
#         summary_data = {
#             'performance_analysis': recent_analyses,
#             'competitor_analysis': competitor_analyses,
#             'simulation_results': recent_simulations,
#             'timestamp': timezone.now()
#         }
        
#         serializer = AnalyticsSummarySerializer(summary_data)
#         return Response(serializer.data)














from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import PerformanceAnalysis, RaceSimulation, CompetitorAnalysis
from .serializers import (
    PerformanceAnalysisSerializer, RaceSimulationSerializer,
    CompetitorAnalysisSerializer, AnalyticsSummarySerializer
)
from telemetry.models import TelemetryData, Vehicle  # ← FIXED IMPORT
from strategy.ml_integration import StrategyMLModels  # ← FIXED IMPORT

class PerformanceAnalysisViewSet(viewsets.ModelViewSet):
    queryset = PerformanceAnalysis.objects.all().order_by('-analysis_timestamp')
    serializer_class = PerformanceAnalysisSerializer
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current performance analysis"""
        ml_models = StrategyMLModels()
        
        # Get latest telemetry data
        latest_telemetry = TelemetryData.objects.all().order_by('-timestamp').first()
        
        if not latest_telemetry:
            return Response({'error': 'No telemetry data available'})
        
        # Generate performance analysis using ML models
        analysis_data = self._generate_performance_analysis(latest_telemetry, ml_models)
        
        # Save analysis
        analysis = PerformanceAnalysis.objects.create(
            vehicle=latest_telemetry.vehicle,
            lap_number=latest_telemetry.lap_number,
            sector_times=analysis_data['sector_times'],
            tire_degradation_impact=analysis_data['tire_impact'],
            fuel_impact=analysis_data['fuel_impact'],
            weather_impact=analysis_data['weather_impact'],
            predicted_lap_time=analysis_data['predicted_time']
        )
        
        serializer = self.get_serializer(analysis)
        return Response(serializer.data)
    
    def _generate_performance_analysis(self, telemetry, ml_models):
        """Generate performance analysis using ML models"""
        # Convert sector times to seconds if they're timedelta objects
        sector_times = []
        for sector in [telemetry.sector1_time, telemetry.sector2_time, telemetry.sector3_time]:
            if sector:
                sector_times.append(sector.total_seconds())
            else:
                sector_times.append(30.0)  # Default if no sector time
        
        return {
            'sector_times': sector_times,
            'tire_impact': 0.15,  # From tire model
            'fuel_impact': 0.05,  # From fuel model
            'weather_impact': 0.08,  # From weather model
            'predicted_time': telemetry.lap_time.total_seconds() + 0.28
        }

class RaceSimulationViewSet(viewsets.ModelViewSet):
    queryset = RaceSimulation.objects.all().order_by('-created_at')
    serializer_class = RaceSimulationSerializer
    
    @action(detail=False, methods=['post'])
    def simulate(self, request):
        """Run race simulation with current data"""
        parameters = request.data.get('parameters', {})
        
        # Generate simulation ID
        simulation_id = f"sim_{timezone.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Run simulation (this would use your ML models)
        simulation_results = self._run_race_simulation(parameters)
        
        # Save simulation
        simulation = RaceSimulation.objects.create(
            simulation_id=simulation_id,
            parameters=parameters,
            results=simulation_results,
            is_completed=True
        )
        
        serializer = self.get_serializer(simulation)
        return Response(serializer.data)
    
    def _run_race_simulation(self, parameters):
        """Run race simulation using ML models"""
        # This would integrate with your trained models for predictive simulation
        return {
            'optimal_pit_lap': 22,
            'predicted_finish_position': 3,
            'expected_total_time': 45 * 60 + 32.15,  # 45 minutes 32.15 seconds
            'tire_degradation_impact': 12.5,
            'fuel_impact': 3.2,
            'weather_impact': 5.1,
            'confidence': 0.78
        }

class AnalyticsSummaryViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get comprehensive analytics summary for dashboard"""
        # Get recent performance analyses
        recent_analyses = PerformanceAnalysis.objects.all().order_by('-analysis_timestamp')[:10]
        
        # Get competitor analyses (handle if model doesn't exist)
        competitor_analyses = []
        try:
            competitor_analyses = CompetitorAnalysis.objects.all().order_by('-analysis_timestamp')[:5]
        except:
            # CompetitorAnalysis model might not be implemented yet
            pass
        
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