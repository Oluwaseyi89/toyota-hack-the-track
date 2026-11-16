# Optional: run training in a container outside Kaggle, with the same pinned
# versions as the backend (Python 3.11 + requirements.txt).
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY road_sense_training ./road_sense_training

# Mount the dataset at /data; pass --upload and SUPABASE_* env vars to publish.
ENTRYPOINT ["python", "-m", "road_sense_training.train", "--data-dir", "/data", "--output-dir", "/outputs"]
