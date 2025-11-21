from rest_framework import serializers
from .models import PerformanceAnalysis, RaceSimulation, CompetitorAnalysis

class PerformanceAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceAnalysis
        fields = '__all__'

class RaceSimulationSerializer(serializers.ModelSerializer):
    class Meta:
        model = RaceSimulation
        fields = '__all__'

class CompetitorAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetitorAnalysis
        fields = '__all__'

class AnalyticsSummarySerializer(serializers.Serializer):
    performance_analysis = PerformanceAnalysisSerializer(many=True)
    competitor_analysis = CompetitorAnalysisSerializer(many=True)
    simulation_results = RaceSimulationSerializer(many=True)
    timestamp = serializers.DateTimeField()