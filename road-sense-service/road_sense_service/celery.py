import os
from celery import Celery
from celery.schedules import crontab
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'road_sense_service.settings')

app = Celery('road_sense_service')

app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
)

# OPTIMIZED Beat Schedule using your actual tasks
app.conf.beat_schedule = {
    # High-frequency: Live telemetry processing (every 10 seconds)
    'process-live-telemetry-every-10-seconds': {
        'task': 'telemetry.tasks.process_live_telemetry',
        'schedule': 10.0,  # Every 10 seconds for real-time racing
    },
    
    # High-frequency: Strategy predictions (every 30 seconds)
    'update-strategy-predictions-every-30-seconds': {
        'task': 'strategy.tasks.update_strategy_predictions',
        'schedule': 30.0,  # Every 30 seconds for real-time strategy
    },
    
    # High-frequency: Alert checking (every 45 seconds)
    'check-alert-conditions-every-45-seconds': {
        'task': 'alerts.tasks.check_alert_conditions',
        'schedule': 45.0,  # Every 45 seconds for safety alerts
    },
    
    # Medium-frequency: External telemetry ingestion (every 2 minutes)
    'ingest-external-telemetry-every-2-min': {
        'task': 'telemetry.tasks.ingest_external_telemetry',
        'schedule': 120.0,  # Every 2 minutes
    },
    
    # Medium-frequency: Weather data updates (every 5 minutes)
    'update-weather-data-every-5-min': {
        'task': 'telemetry.tasks.update_weather_data',
        'schedule': 300.0,  # Every 5 minutes
    },
    
    # Medium-frequency: Performance analytics (every 3 minutes)
    'generate-performance-analytics-every-3-min': {
        'task': 'analytics.tasks.generate_performance_analytics',
        'schedule': 180.0,  # Every 3 minutes
    },
    
    # Low-frequency: Competitor analysis (every 10 minutes)
    'update-competitor-analysis-every-10-min': {
        'task': 'analytics.tasks.update_competitor_analysis',
        'schedule': 600.0,  # Every 10 minutes
    },
    
    # Low-frequency: Batch simulations (every 15 minutes)
    'run-batch-simulations-every-15-min': {
        'task': 'analytics.tasks.run_batch_simulations',
        'schedule': 900.0,  # Every 15 minutes
        'args': (2,)  # Run 2 simulations each time
    },
    
    # Maintenance: Cleanup old telemetry (daily at 3 AM)
    'cleanup-old-telemetry-daily': {
        'task': 'telemetry.tasks.cleanup_old_telemetry',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3 AM
        'args': (24,)  # Clean telemetry older than 24 hours
    },
    
    # Maintenance: Cleanup old alerts (daily at 2 AM)
    'cleanup-old-alerts-daily': {
        'task': 'alerts.tasks.cleanup_old_alerts',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
        'args': (7,)  # Clean alerts older than 7 days
    },
    
    # Maintenance: Auto-acknowledge stale alerts (every 4 hours)
    'acknowledge-stale-alerts-every-4-hours': {
        'task': 'alerts.tasks.acknowledge_stale_alerts',
        'schedule': 14400.0,  # Every 4 hours
        'args': (3,)  # Alerts older than 3 hours
    },
}

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

