from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import Alert, AlertRule
from .serializers import AlertSerializer, AlertRuleSerializer, AlertSummarySerializer
from telemetry.models import TelemetryData
from strategy.ml_integration import StrategyMLModels

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all().order_by('-created_at')
    serializer_class = AlertSerializer
    
    def get_queryset(self):
        queryset = Alert.objects.all().order_by('-created_at')
        
        # Filter by active alerts if requested
        active_only = self.request.query_params.get('active', None)
        if active_only is not None:
            queryset = queryset.filter(is_active=True)
        
        # Filter by severity if provided
        severity = self.request.query_params.get('severity', None)
        if severity:
            queryset = queryset.filter(severity=severity)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active alerts"""
        active_alerts = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(active_alerts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge an alert"""
        alert = self.get_object()
        alert.is_acknowledged = True
        alert.acknowledged_at = timezone.now()
        alert.save()
        
        serializer = self.get_serializer(alert)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def check_conditions(self, request):
        """Check alert conditions and generate new alerts"""
        ml_models = StrategyMLModels()
        new_alerts = []
        
        # Get latest telemetry data
        latest_telemetry = TelemetryData.objects.all().order_by('-timestamp').first()
        
        if latest_telemetry:
            # Check tire wear conditions
            tire_alerts = self._check_tire_conditions(latest_telemetry, ml_models)
            new_alerts.extend(tire_alerts)
            
            # Check fuel conditions
            fuel_alerts = self._check_fuel_conditions(latest_telemetry, ml_models)
            new_alerts.extend(fuel_alerts)
            
            # Check strategy conditions
            strategy_alerts = self._check_strategy_conditions(latest_telemetry, ml_models)
            new_alerts.extend(strategy_alerts)
        
        # Save new alerts
        saved_alerts = []
        for alert_data in new_alerts:
            alert = Alert.objects.create(**alert_data)
            saved_alerts.append(alert)
        
        serializer = self.get_serializer(saved_alerts, many=True)
        return Response({
            'message': f'Generated {len(saved_alerts)} new alerts',
            'alerts': serializer.data
        })
    
    def _check_tire_conditions(self, telemetry, ml_models):
        """Check tire wear conditions and generate alerts"""
        alerts = []
        
        # Use ML model to predict tire degradation
        tire_prediction = ml_models.predict_tire_degradation(telemetry)
        
        if tire_prediction.get('grip_loss_rate', 0) > 0.15:
            alerts.append({
                'vehicle': telemetry.vehicle,
                'alert_type': 'TIRE_WEAR',
                'severity': 'HIGH',
                'title': 'High Tire Degradation Detected',
                'message': f'Front tires degrading at {tire_prediction["grip_loss_rate"]:.3f}s per lap',
                'recommended_action': 'Consider pit stop within 3-5 laps',
                'triggered_by': {'grip_loss_rate': tire_prediction['grip_loss_rate']}
            })
        
        return alerts
    
    def _check_fuel_conditions(self, telemetry, ml_models):
        """Check fuel conditions and generate alerts"""
        alerts = []
        
        # Simulate fuel calculation (would use your fuel model)
        predicted_laps_remaining = 15  # This would come from fuel model
        
        if predicted_laps_remaining < 5:
            alerts.append({
                'vehicle': telemetry.vehicle,
                'alert_type': 'FUEL_LOW',
                'severity': 'HIGH',
                'title': 'Low Fuel Warning',
                'message': f'Only {predicted_laps_remaining} laps of fuel remaining',
                'recommended_action': 'Implement fuel saving measures or plan pit stop',
                'triggered_by': {'laps_remaining': predicted_laps_remaining}
            })
        
        return alerts
    
    def _check_strategy_conditions(self, telemetry, ml_models):
        """Check strategy conditions and generate alerts"""
        alerts = []
        
        # Check for undercut/overcut opportunities
        if telemetry.position in [2, 3, 4]:  # Competitive positions
            alerts.append({
                'vehicle': telemetry.vehicle,
                'alert_type': 'STRATEGY_OPPORTUNITY',
                'severity': 'MEDIUM',
                'title': 'Strategy Opportunity Available',
                'message': 'Undercut opportunity detected against car ahead',
                'recommended_action': 'Consider early pit stop to gain track position',
                'triggered_by': {'position': telemetry.position, 'gap': telemetry.gap_to_leader}
            })
        
        return alerts
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get alert summary for dashboard"""
        active_alerts = Alert.objects.filter(is_active=True)
        high_severity_alerts = active_alerts.filter(severity__in=['HIGH', 'CRITICAL'])
        recent_alerts = active_alerts.order_by('-created_at')[:10]
        
        summary_data = {
            'active_alerts': active_alerts.count(),
            'high_severity_alerts': high_severity_alerts.count(),
            'recent_alerts': recent_alerts
        }
        
        serializer = AlertSummarySerializer(summary_data)
        return Response(serializer.data)

class AlertRuleViewSet(viewsets.ModelViewSet):
    queryset = AlertRule.objects.filter(is_active=True)
    serializer_class = AlertRuleSerializer