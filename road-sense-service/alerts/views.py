# from rest_framework import viewsets, status
# from rest_framework.decorators import action
# from rest_framework.response import Response
# from django.utils import timezone
# from datetime import timedelta
# from .models import Alert, AlertRule
# from .serializers import AlertSerializer, AlertRuleSerializer, AlertSummarySerializer
# from telemetry.models import TelemetryData
# from strategy.ml_integration import StrategyMLModels

# class AlertViewSet(viewsets.ModelViewSet):
#     queryset = Alert.objects.all().order_by('-created_at')
#     serializer_class = AlertSerializer
    
#     def get_queryset(self):
#         queryset = Alert.objects.all().order_by('-created_at')
        
#         # Filter by active alerts if requested
#         active_only = self.request.query_params.get('active', None)
#         if active_only is not None:
#             queryset = queryset.filter(is_active=True)
        
#         # Filter by severity if provided
#         severity = self.request.query_params.get('severity', None)
#         if severity:
#             queryset = queryset.filter(severity=severity)
        
#         return queryset
    
#     @action(detail=False, methods=['get'])
#     def active(self, request):
#         """Get all active alerts"""
#         active_alerts = self.get_queryset().filter(is_active=True)
#         serializer = self.get_serializer(active_alerts, many=True)
#         return Response(serializer.data)
    
#     @action(detail=True, methods=['post'])
#     def acknowledge(self, request, pk=None):
#         """Acknowledge an alert"""
#         alert = self.get_object()
#         alert.is_acknowledged = True
#         alert.acknowledged_at = timezone.now()
#         alert.save()
        
#         serializer = self.get_serializer(alert)
#         return Response(serializer.data)
    
#     @action(detail=False, methods=['post'])
#     def check_conditions(self, request):
#         """Check alert conditions and generate new alerts"""
#         ml_models = StrategyMLModels()
#         new_alerts = []
        
#         # Get latest telemetry data
#         latest_telemetry = TelemetryData.objects.all().order_by('-timestamp').first()
        
#         if latest_telemetry:
#             # Check tire wear conditions
#             tire_alerts = self._check_tire_conditions(latest_telemetry, ml_models)
#             new_alerts.extend(tire_alerts)
            
#             # Check fuel conditions
#             fuel_alerts = self._check_fuel_conditions(latest_telemetry, ml_models)
#             new_alerts.extend(fuel_alerts)
            
#             # Check strategy conditions
#             strategy_alerts = self._check_strategy_conditions(latest_telemetry, ml_models)
#             new_alerts.extend(strategy_alerts)
        
#         # Save new alerts
#         saved_alerts = []
#         for alert_data in new_alerts:
#             alert = Alert.objects.create(**alert_data)
#             saved_alerts.append(alert)
        
#         serializer = self.get_serializer(saved_alerts, many=True)
#         return Response({
#             'message': f'Generated {len(saved_alerts)} new alerts',
#             'alerts': serializer.data
#         })
    
#     def _check_tire_conditions(self, telemetry, ml_models):
#         """Check tire wear conditions and generate alerts"""
#         alerts = []
        
#         # Use ML model to predict tire degradation
#         tire_prediction = ml_models.predict_tire_degradation(telemetry)
        
#         if tire_prediction.get('grip_loss_rate', 0) > 0.15:
#             alerts.append({
#                 'vehicle': telemetry.vehicle,
#                 'alert_type': 'TIRE_WEAR',
#                 'severity': 'HIGH',
#                 'title': 'High Tire Degradation Detected',
#                 'message': f'Front tires degrading at {tire_prediction["grip_loss_rate"]:.3f}s per lap',
#                 'recommended_action': 'Consider pit stop within 3-5 laps',
#                 'triggered_by': {'grip_loss_rate': tire_prediction['grip_loss_rate']}
#             })
        
#         return alerts
    
#     def _check_fuel_conditions(self, telemetry, ml_models):
#         """Check fuel conditions and generate alerts"""
#         alerts = []
        
#         # Simulate fuel calculation (would use your fuel model)
#         predicted_laps_remaining = 15  # This would come from fuel model
        
#         if predicted_laps_remaining < 5:
#             alerts.append({
#                 'vehicle': telemetry.vehicle,
#                 'alert_type': 'FUEL_LOW',
#                 'severity': 'HIGH',
#                 'title': 'Low Fuel Warning',
#                 'message': f'Only {predicted_laps_remaining} laps of fuel remaining',
#                 'recommended_action': 'Implement fuel saving measures or plan pit stop',
#                 'triggered_by': {'laps_remaining': predicted_laps_remaining}
#             })
        
#         return alerts
    
#     def _check_strategy_conditions(self, telemetry, ml_models):
#         """Check strategy conditions and generate alerts"""
#         alerts = []
        
#         # Check for undercut/overcut opportunities
#         if telemetry.position in [2, 3, 4]:  # Competitive positions
#             alerts.append({
#                 'vehicle': telemetry.vehicle,
#                 'alert_type': 'STRATEGY_OPPORTUNITY',
#                 'severity': 'MEDIUM',
#                 'title': 'Strategy Opportunity Available',
#                 'message': 'Undercut opportunity detected against car ahead',
#                 'recommended_action': 'Consider early pit stop to gain track position',
#                 'triggered_by': {'position': telemetry.position, 'gap': telemetry.gap_to_leader}
#             })
        
#         return alerts
    
#     @action(detail=False, methods=['get'])
#     def summary(self, request):
#         """Get alert summary for dashboard"""
#         active_alerts = Alert.objects.filter(is_active=True)
#         high_severity_alerts = active_alerts.filter(severity__in=['HIGH', 'CRITICAL'])
#         recent_alerts = active_alerts.order_by('-created_at')[:10]
        
#         summary_data = {
#             'active_alerts': active_alerts.count(),
#             'high_severity_alerts': high_severity_alerts.count(),
#             'recent_alerts': recent_alerts
#         }
        
#         serializer = AlertSummarySerializer(summary_data)
#         return Response(serializer.data)

# class AlertRuleViewSet(viewsets.ModelViewSet):
#     queryset = AlertRule.objects.filter(is_active=True)
#     serializer_class = AlertRuleSerializer
















from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import UserRateThrottle
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from .models import Alert, AlertRule
from .serializers import AlertSerializer, AlertRuleSerializer, AlertSummarySerializer
from telemetry.models import TelemetryData
from strategy.ml_integration import StrategyMLModels

# Custom pagination for alerts
class AlertPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

# Custom throttling for alert checking
class AlertCheckThrottle(UserRateThrottle):
    rate = '10/minute'  # Limit to 10 checks per minute per user

class AlertViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing racing alerts with intelligent detection and ML integration.
    """
    queryset = Alert.objects.all().order_by('-created_at')
    serializer_class = AlertSerializer
    pagination_class = AlertPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['alert_type', 'severity', 'is_active', 'is_acknowledged']
    search_fields = ['title', 'message']
    
    def get_queryset(self):
        """
        Enhanced queryset with advanced filtering capabilities
        """
        queryset = super().get_queryset()
        
        # Filter by active alerts
        active_only = self.request.query_params.get('active')
        if active_only is not None:
            queryset = queryset.filter(is_active=True)
        
        # Filter by severity levels
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity.upper())
        
        # Filter by time range (last 24 hours by default)
        hours = int(self.request.query_params.get('hours', 24))
        time_threshold = timezone.now() - timedelta(hours=hours)
        queryset = queryset.filter(created_at__gte=time_threshold)
        
        # Filter by vehicle if specified
        vehicle_id = self.request.query_params.get('vehicle_id')
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='active')
    def active(self, request):
        """
        Get all active, unacknowledged alerts for immediate attention
        """
        active_alerts = self.get_queryset().filter(
            is_active=True, 
            is_acknowledged=False
        ).order_by('-severity', '-created_at')
        
        page = self.paginate_queryset(active_alerts)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(active_alerts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='acknowledge')
    def acknowledge(self, request, pk=None):
        """
        Acknowledge an alert to mark it as handled
        """
        alert = self.get_object()
        
        if not alert.is_active:
            return Response(
                {'error': 'Alert is already inactive'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        alert.is_acknowledged = True
        alert.acknowledged_at = timezone.now()
        alert.save()
        
        # Log the acknowledgment
        print(f"Alert {alert.id} acknowledged by user at {alert.acknowledged_at}")
        
        serializer = self.get_serializer(alert)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='escalate')
    def escalate(self, request, pk=None):
        """
        Escalate an alert to higher severity
        """
        alert = self.get_object()
        
        severity_order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        current_index = severity_order.index(alert.severity)
        
        if current_index < len(severity_order) - 1:
            alert.severity = severity_order[current_index + 1]
            alert.save()
            
            serializer = self.get_serializer(alert)
            return Response({
                'message': f'Alert escalated to {alert.severity}',
                'alert': serializer.data
            })
        
        return Response(
            {'error': 'Alert is already at maximum severity'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['post'], url_path='check-conditions', throttle_classes=[AlertCheckThrottle])
    def check_conditions(self, request):
        """
        Check all alert conditions and generate new alerts using ML models
        Throttled to prevent abuse
        """
        ml_models = StrategyMLModels()
        new_alerts = []
        
        # Get latest telemetry data for all vehicles
        latest_telemetry = TelemetryData.objects.all().order_by('-timestamp').first()
        
        if not latest_telemetry:
            return Response(
                {'error': 'No telemetry data available for alert checking'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check all alert conditions
        try:
            # Tire condition checks
            tire_alerts = self._check_tire_conditions(latest_telemetry, ml_models)
            new_alerts.extend(tire_alerts)
            
            # Fuel condition checks
            fuel_alerts = self._check_fuel_conditions(latest_telemetry, ml_models)
            new_alerts.extend(fuel_alerts)
            
            # Strategy condition checks
            strategy_alerts = self._check_strategy_conditions(latest_telemetry, ml_models)
            new_alerts.extend(strategy_alerts)
            
            # Weather condition checks
            weather_alerts = self._check_weather_conditions(latest_telemetry, ml_models)
            new_alerts.extend(weather_alerts)
            
            # Performance condition checks
            performance_alerts = self._check_performance_conditions(latest_telemetry, ml_models)
            new_alerts.extend(performance_alerts)
            
        except Exception as e:
            return Response(
                {'error': f'Alert condition checking failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Save new alerts and prevent duplicates
        saved_alerts = []
        for alert_data in new_alerts:
            # Check if similar alert already exists
            existing_alert = Alert.objects.filter(
                vehicle=alert_data.get('vehicle'),
                alert_type=alert_data['alert_type'],
                is_active=True,
                created_at__gte=timezone.now() - timedelta(minutes=30)  # Last 30 minutes
            ).first()
            
            if not existing_alert:
                alert = Alert.objects.create(**alert_data)
                saved_alerts.append(alert)
        
        # Auto-acknowledge old alerts of the same type for the same vehicle
        self._cleanup_old_alerts(saved_alerts)
        
        serializer = self.get_serializer(saved_alerts, many=True)
        
        return Response({
            'message': f'Generated {len(saved_alerts)} new alerts',
            'alerts_generated': len(saved_alerts),
            'alerts': serializer.data,
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """
        Get comprehensive alert summary for dashboard display
        """
        # Base queryset for summary data
        base_queryset = Alert.objects.filter(
            created_at__gte=timezone.now() - timedelta(hours=24)
        )
        
        # Calculate summary statistics
        active_alerts = base_queryset.filter(is_active=True)
        high_severity_alerts = active_alerts.filter(severity__in=['HIGH', 'CRITICAL'])
        unacknowledged_alerts = active_alerts.filter(is_acknowledged=False)
        
        # Alert type distribution
        alert_type_distribution = (
            base_queryset
            .values('alert_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Recent alerts for display
        recent_alerts = base_queryset.order_by('-created_at')[:10]
        
        summary_data = {
            'statistics': {
                'total_active_alerts': active_alerts.count(),
                'high_severity_alerts': high_severity_alerts.count(),
                'unacknowledged_alerts': unacknowledged_alerts.count(),
                'alerts_last_24h': base_queryset.count(),
            },
            'distribution': list(alert_type_distribution),
            'recent_alerts': AlertSerializer(recent_alerts, many=True).data,
            'timestamp': timezone.now().isoformat()
        }
        
        serializer = AlertSummarySerializer(summary_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='bulk-acknowledge')
    def bulk_acknowledge(self, request):
        """
        Acknowledge multiple alerts at once
        """
        alert_ids = request.data.get('alert_ids', [])
        if not alert_ids:
            return Response(
                {'error': 'No alert IDs provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated_count = Alert.objects.filter(
            id__in=alert_ids, 
            is_active=True
        ).update(
            is_acknowledged=True,
            acknowledged_at=timezone.now()
        )
        
        return Response({
            'message': f'Successfully acknowledged {updated_count} alerts',
            'alerts_acknowledged': updated_count
        })
    
    def _check_tire_conditions(self, telemetry, ml_models):
        """Enhanced tire condition checking with multiple thresholds"""
        alerts = []
        
        try:
            # Use ML model to predict tire degradation
            tire_prediction = ml_models.predict_tire_degradation(telemetry)
            grip_loss_rate = tire_prediction.get('grip_loss_rate', 0)
            predicted_laps = tire_prediction.get('predicted_laps_remaining', 20)
            
            # Multiple severity levels based on degradation rate
            if grip_loss_rate > 0.20:
                alerts.append({
                    'vehicle': telemetry.vehicle,
                    'alert_type': 'TIRE_WEAR',
                    'severity': 'CRITICAL',
                    'title': 'Critical Tire Degradation',
                    'message': f'Extreme tire degradation: {grip_loss_rate:.3f}s per lap. Only {predicted_laps} laps remaining.',
                    'recommended_action': 'Immediate pit stop required',
                    'triggered_by': {
                        'grip_loss_rate': grip_loss_rate,
                        'predicted_laps_remaining': predicted_laps,
                        'threshold': 0.20
                    }
                })
            elif grip_loss_rate > 0.15:
                alerts.append({
                    'vehicle': telemetry.vehicle,
                    'alert_type': 'TIRE_WEAR',
                    'severity': 'HIGH',
                    'title': 'High Tire Degradation',
                    'message': f'High tire degradation: {grip_loss_rate:.3f}s per lap. {predicted_laps} laps remaining.',
                    'recommended_action': 'Plan pit stop within 2-3 laps',
                    'triggered_by': {
                        'grip_loss_rate': grip_loss_rate,
                        'predicted_laps_remaining': predicted_laps,
                        'threshold': 0.15
                    }
                })
            elif grip_loss_rate > 0.10:
                alerts.append({
                    'vehicle': telemetry.vehicle,
                    'alert_type': 'TIRE_WEAR', 
                    'severity': 'MEDIUM',
                    'title': 'Moderate Tire Degradation',
                    'message': f'Moderate tire degradation: {grip_loss_rate:.3f}s per lap',
                    'recommended_action': 'Monitor tire performance closely',
                    'triggered_by': {
                        'grip_loss_rate': grip_loss_rate,
                        'predicted_laps_remaining': predicted_laps,
                        'threshold': 0.10
                    }
                })
                
        except Exception as e:
            print(f"Tire condition check failed: {e}")
            
        return alerts
    
    def _check_fuel_conditions(self, telemetry, ml_models):
        """Enhanced fuel condition checking with multiple thresholds"""
        alerts = []
        
        try:
            # Simulate fuel calculation (would use your fuel model)
            predicted_laps_remaining = 18 - (telemetry.lap_number % 20)  # Simulated
            
            if predicted_laps_remaining < 3:
                alerts.append({
                    'vehicle': telemetry.vehicle,
                    'alert_type': 'FUEL_LOW',
                    'severity': 'CRITICAL',
                    'title': 'Critical Fuel Level',
                    'message': f'CRITICAL: Only {predicted_laps_remaining} laps of fuel remaining',
                    'recommended_action': 'PIT THIS LAP - Fuel saving impossible',
                    'triggered_by': {
                        'laps_remaining': predicted_laps_remaining,
                        'threshold': 3
                    }
                })
            elif predicted_laps_remaining < 5:
                alerts.append({
                    'vehicle': telemetry.vehicle,
                    'alert_type': 'FUEL_LOW', 
                    'severity': 'HIGH',
                    'title': 'Very Low Fuel',
                    'message': f'Only {predicted_laps_remaining} laps of fuel remaining',
                    'recommended_action': 'Pit within 2 laps or implement extreme fuel saving',
                    'triggered_by': {
                        'laps_remaining': predicted_laps_remaining,
                        'threshold': 5
                    }
                })
            elif predicted_laps_remaining < 8:
                alerts.append({
                    'vehicle': telemetry.vehicle,
                    'alert_type': 'FUEL_LOW',
                    'severity': 'MEDIUM', 
                    'title': 'Low Fuel Warning',
                    'message': f'Low fuel: {predicted_laps_remaining} laps remaining',
                    'recommended_action': 'Plan pit stop and consider fuel saving measures',
                    'triggered_by': {
                        'laps_remaining': predicted_laps_remaining,
                        'threshold': 8
                    }
                })
                
        except Exception as e:
            print(f"Fuel condition check failed: {e}")
            
        return alerts
    
    def _check_strategy_conditions(self, telemetry, ml_models):
        """Enhanced strategy opportunity detection"""
        alerts = []
        
        try:
            # Check for undercut opportunities (pitting before competitor)
            if telemetry.position in [2, 3, 4] and telemetry.gap_to_leader < 3.0:
                alerts.append({
                    'vehicle': telemetry.vehicle,
                    'alert_type': 'STRATEGY_OPPORTUNITY',
                    'severity': 'HIGH',
                    'title': 'Undercut Opportunity',
                    'message': f'Undercut available! Car ahead in P{telemetry.position-1} is within {telemetry.gap_to_leader:.2f}s',
                    'recommended_action': 'Consider early pit stop to jump ahead',
                    'triggered_by': {
                        'position': telemetry.position,
                        'gap_to_leader': telemetry.gap_to_leader,
                        'opportunity_type': 'undercut'
                    }
                })
            
            # Check for overcut opportunities (pitting after competitor)  
            if telemetry.position == 1 and telemetry.gap_to_leader == 0:
                # Leader can control pace and overcut
                alerts.append({
                    'vehicle': telemetry.vehicle,
                    'alert_type': 'STRATEGY_OPPORTUNITY', 
                    'severity': 'MEDIUM',
                    'title': 'Overcut Opportunity Available',
                    'message': 'Leading position allows for overcut strategy',
                    'recommended_action': 'Extend stint and pit after competitors',
                    'triggered_by': {
                        'position': telemetry.position,
                        'opportunity_type': 'overcut'
                    }
                })
                
        except Exception as e:
            print(f"Strategy condition check failed: {e}")
            
        return alerts
    
    def _check_weather_conditions(self, telemetry, ml_models):
        """Weather-related alert conditions"""
        alerts = []
        # This would integrate with your weather model
        # Placeholder for weather alert logic
        return alerts
    
    def _check_performance_conditions(self, telemetry, ml_models):
        """Performance anomaly detection"""
        alerts = []
        
        try:
            # Check for significant lap time drop-off
            recent_laps = TelemetryData.objects.filter(
                vehicle=telemetry.vehicle
            ).order_by('-timestamp')[:5]
            
            if len(recent_laps) >= 3:
                avg_recent_time = sum(lap.lap_time.total_seconds() for lap in recent_laps) / len(recent_laps)
                current_time = telemetry.lap_time.total_seconds()
                
                if current_time > avg_recent_time + 1.0:  # 1+ second slower
                    alerts.append({
                        'vehicle': telemetry.vehicle,
                        'alert_type': 'PERFORMANCE_DROP',
                        'severity': 'MEDIUM',
                        'title': 'Performance Drop Detected',
                        'message': f'Lap time {current_time - avg_recent_time:.2f}s slower than recent average',
                        'recommended_action': 'Check for mechanical issues or driver error',
                        'triggered_by': {
                            'current_lap_time': current_time,
                            'average_recent_time': avg_recent_time,
                            'difference': current_time - avg_recent_time
                        }
                    })
                    
        except Exception as e:
            print(f"Performance condition check failed: {e}")
            
        return alerts
    
    def _cleanup_old_alerts(self, new_alerts):
        """
        Auto-acknowledge old alerts when new ones of the same type are generated
        """
        for new_alert_data in new_alerts:
            Alert.objects.filter(
                vehicle=new_alert_data.get('vehicle'),
                alert_type=new_alert_data['alert_type'],
                is_active=True,
                created_at__lt=timezone.now() - timedelta(minutes=30)
            ).update(
                is_acknowledged=True,
                acknowledged_at=timezone.now()
            )

class AlertRuleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing alert rules and conditions
    """
    queryset = AlertRule.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = AlertRuleSerializer
    pagination_class = AlertPagination
    
    @action(detail=True, methods=['post'], url_path='test')
    def test_rule(self, request, pk=None):
        """
        Test an alert rule against current data
        """
        rule = self.get_object()
        # Implementation for rule testing would go here
        return Response({'message': f'Rule {rule.name} test executed'})