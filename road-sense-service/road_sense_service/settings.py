"""
Django settings for road_sense_service.

Everything environment-specific is read from environment variables so the
same code runs locally and on Render (web service + Celery worker + beat),
backed by Supabase Postgres. See .env.example for the full list.
"""

import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


BASE_DIR = Path(__file__).resolve().parent.parent


# ---------------------------------------------------------------------------
# Environment helpers
# ---------------------------------------------------------------------------

def env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name, default=None):
    value = os.environ.get(name)
    if value is None:
        return list(default or [])
    return [item.strip() for item in value.split(",") if item.strip()]


# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

DEBUG = env_bool("DJANGO_DEBUG", False)

# Production = HTTPS, cross-site cookies, strict secrets. Defaults to the
# opposite of DEBUG but can be set explicitly.
IS_PRODUCTION = env_bool("IS_PRODUCTION", not DEBUG)

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if IS_PRODUCTION:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set in production.")
    SECRET_KEY = "django-insecure-local-development-only"

# Backend hostnames this service answers to. Render sets
# RENDER_EXTERNAL_HOSTNAME automatically for web services.
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["localhost", "127.0.0.1"])
RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME and RENDER_EXTERNAL_HOSTNAME not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)


# ---------------------------------------------------------------------------
# CORS / CSRF / WebSocket origins (frontend on Vercel)
# ---------------------------------------------------------------------------

LOCAL_FRONTEND_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

# Exact frontend origins, e.g. https://road-sense-app.vercel.app
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", [] if IS_PRODUCTION else LOCAL_FRONTEND_ORIGINS
)

# Optional regexes for Vercel preview deployments. Keep them scoped to your
# own project, e.g. ^https://road-sense-app(-[a-z0-9-]+)?\.vercel\.app$
# Never allow every *.vercel.app: credentials are enabled, so any Vercel
# site could make authenticated requests on a user's behalf.
CORS_ALLOWED_ORIGIN_REGEXES = env_list("CORS_ALLOWED_ORIGIN_REGEXES")

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", CORS_ALLOWED_ORIGINS)

# Browser origins allowed to open the telemetry WebSocket (see asgi.py).
WEBSOCKET_ALLOWED_ORIGINS = env_list("WEBSOCKET_ALLOWED_ORIGINS", CORS_ALLOWED_ORIGINS)


# ---------------------------------------------------------------------------
# Sessions & cookies
# ---------------------------------------------------------------------------
# The frontend (vercel.app) and backend (onrender.com) are different sites,
# so in production cookies must be SameSite=None and Secure to be sent at all.

SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_COOKIE_NAME = "sessionid"
SESSION_COOKIE_AGE = 60 * 60 * 24 * 14  # 2 weeks
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = IS_PRODUCTION
SESSION_COOKIE_SAMESITE = "None" if IS_PRODUCTION else "Lax"

CSRF_COOKIE_NAME = "csrftoken"
CSRF_COOKIE_HTTPONLY = False  # the token is also returned by /api/accounts/csrf-token/
CSRF_COOKIE_SECURE = IS_PRODUCTION
CSRF_COOKIE_SAMESITE = "None" if IS_PRODUCTION else "Lax"
CSRF_USE_SESSIONS = False

if IS_PRODUCTION:
    # Render terminates TLS at its proxy and forwards X-Forwarded-Proto.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_CONTENT_TYPE_NOSNIFF = True


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "corsheaders",
    "channels",
    "drf_yasg",

    "telemetry.apps.TelemetryConfig",
    "strategy.apps.StrategyConfig",
    "analytics.apps.AnalyticsConfig",
    "alerts.apps.AlertsConfig",
    "accounts.apps.AccountsConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "road_sense_service.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "road_sense_service.wsgi.application"
ASGI_APPLICATION = "road_sense_service.asgi.application"


# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    # Every endpoint requires a logged-in user unless a view opts out
    # explicitly (login, register, csrf-token, API docs).
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}


# ---------------------------------------------------------------------------
# Database (Supabase Postgres)
# ---------------------------------------------------------------------------
# Use Supabase's *Session pooler* connection string (port 5432): it is
# IPv4-reachable from Render and supports long-lived Django connections.
# If you use the *Transaction pooler* (port 6543) instead, server-side cursors
# are disabled automatically below because PgBouncer can't support them.

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL and IS_PRODUCTION:
    raise ImproperlyConfigured("DATABASE_URL must be set in production.")

DATABASES = {
    "default": dj_database_url.parse(
        DATABASE_URL or f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=int(os.environ.get("DB_CONN_MAX_AGE", 60)),
        conn_health_checks=True,
        ssl_require=bool(DATABASE_URL) and env_bool("DB_SSL_REQUIRE", True),
    )
}

if DATABASES["default"].get("PORT") in (6543, "6543"):
    DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True


# ---------------------------------------------------------------------------
# Redis: Channels layer + Celery (Render Key Value)
# ---------------------------------------------------------------------------

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [REDIS_URL]},
    },
}

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

AUTH_USER_MODEL = "accounts.User"

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LOGIN_URL = "/api/accounts/auth/login/"
LOGIN_REDIRECT_URL = "/"
LOGOUT_REDIRECT_URL = "/"


# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# ---------------------------------------------------------------------------
# Static & media files (served by WhiteNoise for admin / Swagger)
# ---------------------------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}


# ---------------------------------------------------------------------------
# ML models
# ---------------------------------------------------------------------------

ML_MODELS_DIR = os.environ.get("ML_MODELS_DIR", str(BASE_DIR / "ml_models"))


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
