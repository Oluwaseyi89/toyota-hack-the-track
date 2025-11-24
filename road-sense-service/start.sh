#!/bin/bash

set -e

PORT=${PORT:-8080}
echo "Starting Road Sense Racing Analytics on port: $PORT"

# Wait for database to be ready (uses nc which is now installed)
echo "Waiting for database..."
while ! nc -z $SUPABASE_POSTGRES_HOST $SUPABASE_POSTGRES_PORT; do
  sleep 1
done
echo "Database is ready!"

# Fixed Redis check using Python (redis-cli isn't installed)
echo "Checking Redis connection..."
until python -c "
import redis
import os
try:
    r = redis.Redis.from_url('$REDIS_URL')
    r.ping()
    print('Redis connected successfully')
    exit(0)
except Exception as e:
    print(f'Redis connection failed: {e}')
    exit(1)
"; do
    sleep 1
done
echo "Redis is ready!"

# Run database migrations with error handling
echo "Running database migrations..."
if ! python manage.py migrate --noinput; then
    echo "ERROR: Database migrations failed!"
    exit 1
fi

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Create superuser if needed
if [ "$CREATE_SUPERUSER" = "true" ]; then
    echo "Creating superuser..."
    python manage.py createsuperuser --noinput || true
fi

# Process type handling for Cloud Run
if [ "$PROCESS_TYPE" = "worker" ]; then
    echo "Starting Celery Worker..."
    exec celery -A road_sense_service worker --loglevel=info --concurrency=2 --max-tasks-per-child=100
    
elif [ "$PROCESS_TYPE" = "beat" ]; then
    echo "Starting Celery Beat..."
    exec celery -A road_sense_service beat --loglevel=info
    
else
    echo "Starting Django Server with WebSocket, Celery Worker AND Beat..."
    
    # Start Celery Worker in background
    echo "Starting Celery Worker in background..."
    celery -A road_sense_service worker --loglevel=info --concurrency=2 --max-tasks-per-child=100 &
    WORKER_PID=$!
    
    # Start Celery Beat in background
    echo "Starting Celery Beat in background..."
    celery -A road_sense_service beat --loglevel=info &
    BEAT_PID=$!
    
    # Function to kill background processes
    cleanup() {
        echo "Shutting down..."
        kill $WORKER_PID $BEAT_PID 2>/dev/null
        wait $WORKER_PID $BEAT_PID 2>/dev/null
        exit 0
    }
    
    # Set trap to cleanup on exit
    trap cleanup SIGTERM SIGINT
    
    # Start Daphne WebSocket server (main process)
    echo "Starting Daphne WebSocket server on port $PORT..."
    exec daphne -b 0.0.0.0 -p $PORT road_sense_service.asgi:application
fi





























# set -e

# PORT=${PORT:-8080}
# echo "Starting Road Sense Racing Analytics on port: $PORT"

# # Wait for database to be ready
# echo "Waiting for database..."
# while ! nc -z $SUPABASE_POSTGRES_HOST $SUPABASE_POSTGRES_PORT; do
#   sleep 1
# done
# echo "Database is ready!"

# # Simple Redis check using redis-cli if available, otherwise skip
# if command -v redis-cli &> /dev/null; then
#     echo "Checking Redis connection..."
#     until redis-cli -u $REDIS_URL ping | grep -q "PONG"; do
#         sleep 1
#     done
#     echo "Redis is ready!"
# else
#     echo "Skipping Redis check (redis-cli not available)"
#     sleep 3  # Give Redis time to be ready
# fi

# # Run database migrations
# echo "Running database migrations..."
# python manage.py migrate --noinput

# # Collect static files
# echo "Collecting static files..."
# python manage.py collectstatic --noinput --clear

# # Create superuser if needed
# if [ "$CREATE_SUPERUSER" = "true" ]; then
#     echo "Creating superuser..."
#     python manage.py createsuperuser --noinput || true
# fi

# # Process type handling for Cloud Run
# if [ "$PROCESS_TYPE" = "worker" ]; then
#     echo "Starting Celery Worker..."
#     exec celery -A road_sense_service worker --loglevel=info --concurrency=2 --max-tasks-per-child=100
    
# elif [ "$PROCESS_TYPE" = "beat" ]; then
#     echo "Starting Celery Beat..."
#     exec celery -A road_sense_service beat --loglevel=info
    
# else
#     echo "Starting Django Server with WebSocket, Celery Worker AND Beat..."
    
#     # Start Celery Worker in background
#     echo "Starting Celery Worker in background..."
#     celery -A road_sense_service worker --loglevel=info --concurrency=2 --max-tasks-per-child=100 &
#     WORKER_PID=$!
    
#     # Start Celery Beat in background
#     echo "Starting Celery Beat in background..."
#     celery -A road_sense_service beat --loglevel=info &
#     BEAT_PID=$!
    
#     # Function to kill background processes
#     cleanup() {
#         echo "Shutting down..."
#         kill $WORKER_PID $BEAT_PID 2>/dev/null
#         wait $WORKER_PID $BEAT_PID 2>/dev/null
#         exit 0
#     }
    
#     # Set trap to cleanup on exit
#     trap cleanup SIGTERM SIGINT
    
#     # Start Daphne WebSocket server (main process)
#     echo "Starting Daphne WebSocket server on port $PORT..."
#     exec daphne -b 0.0.0.0 -p $PORT road_sense_service.asgi:application
# fi









# set -e

# PORT=${PORT:-8080}
# echo "Starting Road Sense Racing Analytics on port: $PORT"

# # Wait for database to be ready (optional but recommended)
# echo "Waiting for database..."
# while ! nc -z $SUPABASE_POSTGRES_HOST $SUPABASE_POSTGRES_PORT; do
#   sleep 0.1
# done
# echo "Database is ready!"

# # Run database migrations
# echo "Running database migrations..."
# python manage.py migrate --noinput

# # Collect static files (if needed)
# echo "Collecting static files..."
# python manage.py collectstatic --noinput --clear

# # Create superuser if needed (for development - remove in production)
# if [ "$CREATE_SUPERUSER" = "true" ]; then
#     echo "Creating superuser..."
#     python manage.py createsuperuser --noinput || true
# fi

# # Process type handling for Cloud Run
# if [ "$PROCESS_TYPE" = "worker" ]; then
#     echo "Starting Celery Worker..."
#     exec celery -A road_sense_service worker --loglevel=info --concurrency=2
    
# elif [ "$PROCESS_TYPE" = "beat" ]; then
#     echo "Starting Celery Beat..."
#     exec celery -A road_sense_service beat --loglevel=info
    
# else
#     echo "Starting Django Server with WebSocket, Celery Worker AND Beat..."
    
#     # Start Celery Worker in background
#     echo "Starting Celery Worker in background..."
#     celery -A road_sense_service worker --loglevel=info --concurrency=2 &
    
#     # Start Celery Beat in background  
#     echo "Starting Celery Beat in background..."
#     celery -A road_sense_service beat --loglevel=info &
    
#     # Start Daphne WebSocket server (main process)
#     echo "Starting Daphne WebSocket server on port $PORT..."
#     exec daphne -b 0.0.0.0 -p $PORT road_sense_service.asgi:application
# fi