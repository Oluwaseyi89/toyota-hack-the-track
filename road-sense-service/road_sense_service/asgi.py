"""
ASGI config for road_sense_service project.

Serves HTTP (Django) and WebSocket (Channels) traffic, e.g.:
    daphne -b 0.0.0.0 -p $PORT road_sense_service.asgi:application
"""

import os

from django.conf import settings
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'road_sense_service.settings')

# Initialise Django before importing anything that touches models/consumers.
django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack  # noqa: E402
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import OriginValidator  # noqa: E402

import telemetry.routing  # noqa: E402
from road_sense_service.jobs import BackgroundJobsMiddleware  # noqa: E402

# BackgroundJobsMiddleware starts the in-process job scheduler (replaces
# Celery/Redis) on the first connection, inside Daphne's event loop.
application = BackgroundJobsMiddleware(ProtocolTypeRouter({
    "http": django_asgi_app,
    # OriginValidator stops other sites from opening a socket with the user's
    # session cookie (cross-site WebSocket hijacking); AuthMiddlewareStack
    # resolves scope["user"] from that session for the consumer's auth check.
    "websocket": OriginValidator(
        AuthMiddlewareStack(
            URLRouter(telemetry.routing.websocket_urlpatterns)
        ),
        settings.WEBSOCKET_ALLOWED_ORIGINS,
    ),
}))
