import redis
from core.config import settings

def get_redis_connection():
    return redis.from_url(settings.REDIS_URL, decode_responses=True)