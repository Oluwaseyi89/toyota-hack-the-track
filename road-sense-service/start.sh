#!/bin/bash
# Single-process startup: Daphne serves HTTP + WebSockets and runs the
# background jobs in-process (road_sense_service/jobs.py). No Redis/Celery.
# Run exactly ONE instance of this service.

set -e

export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-road_sense_service.settings}

PORT=${PORT:-8080}
echo "Starting Road Sense Racing Analytics on port: $PORT"

# Wait for the database (DATABASE_URL) to accept connections, max ~60s
echo "Waiting for database..."
for attempt in $(seq 1 30); do
  if python -c "import django; django.setup(); from django.db import connection; connection.ensure_connection()" 2>/dev/null; then
    echo "Database is ready!"
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "ERROR: database not reachable; check DATABASE_URL"
    exit 1
  fi
  sleep 2
done

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

if [ "$CREATE_SUPERUSER" = "true" ]; then
    echo "Creating superuser..."
    python manage.py createsuperuser --noinput || true
fi

echo "Starting Daphne on port $PORT..."
exec daphne -b 0.0.0.0 -p "$PORT" road_sense_service.asgi:application
