#!/bin/bash

# Start Celery worker
celery -A config worker --loglevel=info --concurrency=4 &

# Start Celery beat for periodic tasks
celery -A config beat --loglevel=info &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?