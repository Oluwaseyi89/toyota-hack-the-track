from celery import Celery
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'road_sense_service.settings')

app = Celery('road_sense')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks(['tasks'])  # Discover tasks in tasks/ directory