from rest_framework import serializers
from .models import Alert, AlertRule

class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = '__all__'

class AlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertRule
        fields = '__all__'

class AlertSummarySerializer(serializers.Serializer):
    active_alerts = serializers.IntegerField()
    high_severity_alerts = serializers.IntegerField()
    recent_alerts = AlertSerializer(many=True)