from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from accounts.permissions import CanModifyStrategy
from telemetry import metrics

from .ml_integration import StrategyMLModels
from .models import PitStrategy, TireStrategy, FuelStrategy
from .serializers import (
    PitStrategySerializer, TireStrategySerializer, StrategyPredictionSerializer,
)
from .services import generate_vehicle_strategy, latest_telemetry_for

NO_TELEMETRY = {'error': 'No telemetry data available'}


def _focus_telemetry(request):
    """Latest lap for the user's preferred car, else the most recent car."""
    preferred = getattr(request.user, 'preferred_vehicle', None)
    return latest_telemetry_for(preferred) or latest_telemetry_for()


def _generate(telemetry):
    snapshot = list(metrics.latest_per_vehicle())
    return generate_vehicle_strategy(telemetry, StrategyMLModels(), snapshot)


class PitStrategyViewSet(viewsets.ModelViewSet):
    queryset = PitStrategy.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = PitStrategySerializer
    permission_classes = [CanModifyStrategy]

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Fresh pit strategy for the focus car, computed from its telemetry."""
        telemetry = _focus_telemetry(request)
        if not telemetry:
            return Response(NO_TELEMETRY)
        pit_strategy, _, _ = _generate(telemetry)
        return Response(self.get_serializer(pit_strategy).data)


class TireStrategyViewSet(viewsets.ModelViewSet):
    queryset = TireStrategy.objects.all().order_by('-created_at')
    serializer_class = TireStrategySerializer
    permission_classes = [CanModifyStrategy]

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Fresh tire strategy for the focus car, computed from its telemetry."""
        telemetry = _focus_telemetry(request)
        if not telemetry:
            return Response(NO_TELEMETRY)
        _, tire_strategy, _ = _generate(telemetry)
        return Response(self.get_serializer(tire_strategy).data)


class StrategyPredictionViewSet(viewsets.ViewSet):
    permission_classes = [CanModifyStrategy]

    @action(detail=False, methods=['get'])
    def comprehensive(self, request):
        """
        Latest pit, tire and fuel strategy for the focus car. Uses the rows
        produced by the scheduled job, generating them if none exist yet.
        """
        telemetry = _focus_telemetry(request)
        if not telemetry:
            return Response(NO_TELEMETRY)

        vehicle = telemetry.vehicle
        pit = PitStrategy.objects.filter(vehicle=vehicle, is_active=True).order_by('-created_at').first()
        tire = TireStrategy.objects.filter(vehicle=vehicle).order_by('-created_at').first()
        fuel = FuelStrategy.objects.filter(vehicle=vehicle).order_by('-created_at').first()
        if not (pit and tire and fuel):
            pit, tire, fuel = _generate(telemetry)

        serializer = StrategyPredictionSerializer({
            'pit_strategy': pit,
            'tire_strategy': tire,
            'fuel_strategy': fuel,
            'timestamp': timezone.now(),
        })
        return Response(serializer.data)
