# main.py
import asyncio
import redis
from celery import Celery
from core.config import settings
from core.database import get_redis_connection

# Celery app configuration
app = Celery('road_sense_worker',
             broker=settings.REDIS_URL,
             backend=settings.REDIS_URL)

app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_routes={
        'workers.telemetry_worker.*': {'queue': 'telemetry'},
        'workers.simulation_worker.*': {'queue': 'simulation'},
        'workers.prediction_worker.*': {'queue': 'prediction'},
    }
)

@app.task
def health_check():
    return {"status": "healthy", "service": "road-sense-worker"}