"""
Analytics background jobs, scheduled in-process by road_sense_service.jobs.
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from strategy.models import FuelStrategy, PitStrategy, TireStrategy
from telemetry import metrics

from .models import CompetitorAnalysis, PerformanceAnalysis, RaceSimulation
from .services import analyze_competitor, analyze_vehicle_performance, run_and_store_simulation

logger = logging.getLogger(__name__)


def _live_snapshot():
    return list(metrics.latest_per_vehicle(settings.TELEMETRY_LIVE_WINDOW_SECONDS))


def generate_performance_analytics():
    """Performance analysis for every car with recent laps."""
    snapshot = _live_snapshot()
    for telemetry in snapshot:
        analyze_vehicle_performance(telemetry, snapshot)
    return f"Generated analytics for {len(snapshot)} vehicles"


def update_competitor_analysis():
    """Competitor analysis (trend, tire age, threat) for every car."""
    snapshot = _live_snapshot()
    for telemetry in snapshot:
        analyze_competitor(telemetry, snapshot)
    return f"Updated {len(snapshot)} competitor analyses"


def run_batch_simulations(simulation_count=2):
    """Strategy simulations for the top `simulation_count` cars."""
    snapshot = _live_snapshot()
    for telemetry in snapshot[:simulation_count]:
        run_and_store_simulation(telemetry, prefix="batch", snapshot=snapshot)
    return f"Ran {min(simulation_count, len(snapshot))} batch simulations"


def prune_history(hours_old=None):
    """
    Delete derived rows (strategies, analyses, simulations) older than
    HISTORY_RETENTION_HOURS; the jobs add rows every few seconds, so without
    this the tables grow without limit. Active pit strategies are kept.
    """
    cutoff = timezone.now() - timedelta(hours=hours_old or settings.HISTORY_RETENTION_HOURS)
    deleted = 0
    for queryset in (
        TireStrategy.objects.filter(created_at__lt=cutoff),
        FuelStrategy.objects.filter(created_at__lt=cutoff),
        PitStrategy.objects.filter(created_at__lt=cutoff, is_active=False),
        PerformanceAnalysis.objects.filter(analysis_timestamp__lt=cutoff),
        CompetitorAnalysis.objects.filter(analysis_timestamp__lt=cutoff),
        RaceSimulation.objects.filter(created_at__lt=cutoff),
    ):
        count, _ = queryset.delete()
        deleted += count
    return f"Pruned {deleted} history rows"
