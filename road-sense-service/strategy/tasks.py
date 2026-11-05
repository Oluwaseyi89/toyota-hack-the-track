"""
Strategy background job, scheduled in-process by road_sense_service.jobs.
"""
import logging

from django.conf import settings

from telemetry import metrics

from .ml_integration import StrategyMLModels
from .services import generate_vehicle_strategy

logger = logging.getLogger(__name__)


def update_strategy_predictions():
    """Refresh pit, tire and fuel strategies for every car with recent laps."""
    ml_models = StrategyMLModels()
    snapshot = list(metrics.latest_per_vehicle(settings.TELEMETRY_LIVE_WINDOW_SECONDS))

    for telemetry in snapshot:
        generate_vehicle_strategy(telemetry, ml_models, snapshot)

    return f"Updated strategies for {len(snapshot)} vehicles"
