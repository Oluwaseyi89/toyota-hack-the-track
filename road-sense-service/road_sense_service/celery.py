import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'road_sense_service.settings')

app = Celery('road_sense')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()

# Optional configuration for better performance
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    worker_prefetch_multiplier=1,  # Better for I/O bound tasks
    task_acks_late=True,  # Tasks acknowledged after execution
    worker_max_tasks_per_child=1000,  # Prevent memory leaks
)

# Beat Schedule for periodic tasks
app.conf.beat_schedule = {
    'process-telemetry-every-5-seconds': {
        'task': 'apps.telemetry.tasks.process_live_telemetry',
        'schedule': 5.0,  # Every 5 seconds
    },
    'update-strategy-predictions-every-10-seconds': {
        'task': 'apps.strategy.tasks.update_strategy_predictions',
        'schedule': 10.0,  # Every 10 seconds
    },
    'check-alert-conditions-every-15-seconds': {
        'task': 'apps.alerts.tasks.check_alert_conditions',
        'schedule': 15.0,  # Every 15 seconds
    },
    'generate-analytics-every-30-seconds': {
        'task': 'apps.analytics.tasks.generate_performance_analytics',
        'schedule': 30.0,  # Every 30 seconds
    },
    'cleanup-old-data-every-hour': {
        'task': 'apps.telemetry.tasks.cleanup_old_telemetry',
        'schedule': 3600.0,  # Every hour
    },
}

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')