FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV PORT=8080

WORKDIR /app

# Install system dependencies - FIXED VERSION
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    postgresql-client \
    redis-tools \
    netcat-openbsd \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -r appuser && chown -R appuser /app
USER appuser

# Make startup script executable
RUN chmod +x start.sh

EXPOSE $PORT

CMD ["./start.sh"]
