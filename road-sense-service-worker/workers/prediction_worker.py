from main import app 
import joblib
import numpy as np

@app.task
def predict_tire_degradation(telemetry_data: dict, laps_ahead: int = 10):
    """Predict tire wear for future laps"""
    try:
        # Load pre-trained model
        tire_model = joblib.load('models/tire_degradation.pkl')
        
        # Prepare features
        features = np.array([
            telemetry_data['current_wear'],
            telemetry_data['lap_count'],
            telemetry_data['track_temp'],
            telemetry_data['lateral_forces']
        ]).reshape(1, -1)
        
        # Predict degradation
        predictions = []
        current_wear = features[0][0]
        
        for lap in range(laps_ahead):
            wear_rate = tire_model.predict(features)[0]
            current_wear += wear_rate
            predictions.append({
                'lap': telemetry_data['lap_count'] + lap + 1,
                'predicted_wear': min(current_wear, 100.0),
                'critical': current_wear > 80.0
            })
            
            # Update features for next prediction
            features[0][0] = current_wear
            features[0][1] += 1
        
        return predictions
        
    except Exception as exc:
        return {'error': f'Tire prediction failed: {str(exc)}'}