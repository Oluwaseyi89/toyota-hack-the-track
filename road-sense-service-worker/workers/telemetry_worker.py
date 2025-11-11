from main import app 
from celery import current_app
import pandas as pd
from utils.data_processor import TelemetryProcessor

@app.task(bind=True, max_retries=3)
def process_telemetry_batch(self, batch_data: dict):
    """Process real-time telemetry data"""
    try:
        processor = TelemetryProcessor()
        
        # Calculate key metrics
        tire_wear = processor.calculate_tire_wear(batch_data)
        fuel_consumption = processor.calculate_fuel_usage(batch_data)
        pace_analysis = processor.analyze_pace(batch_data)
        
        # Store processed data
        result = {
            'tire_wear': tire_wear,
            'fuel_remaining': fuel_consumption,
            'pace_metrics': pace_analysis,
            'timestamp': pd.Timestamp.now().isoformat()
        }
        
        # Trigger real-time analysis
        current_app.send_task(
            'workers.prediction_worker.analyze_race_state',
            kwargs={'processed_data': result}
        )
        
        return result
        
    except Exception as exc:
        self.retry(countdown=2 ** self.request.retries, exc=exc)