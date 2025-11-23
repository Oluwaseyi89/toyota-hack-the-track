import joblib
import numpy as np
from django.conf import settings
import os

class StrategyMLModels:
    def __init__(self):
        self.tire_model = None
        self.pit_strategy_model = None
        self.fuel_model = None
        self.weather_model = None
        self.load_models()
    
    def load_models(self):
        """Load all trained ML models"""
        try:
            models_dir = settings.ML_MODELS_DIR
            
            # Load tire degradation model
            tire_model_path = os.path.join(models_dir, 'tire_degradation_model.pkl')
            if os.path.exists(tire_model_path):
                self.tire_model = joblib.load(tire_model_path)
            
            # Load pit strategy model
            pit_model_path = os.path.join(models_dir, 'pit_strategy_model.pkl')
            if os.path.exists(pit_model_path):
                self.pit_strategy_model = joblib.load(pit_model_path)
            
            # Load fuel model
            fuel_model_path = os.path.join(models_dir, 'fuel_model.pkl')
            if os.path.exists(fuel_model_path):
                self.fuel_model = joblib.load(fuel_model_path)
            
            # Load weather model
            weather_model_path = os.path.join(models_dir, 'weather_model.pkl')
            if os.path.exists(weather_model_path):
                self.weather_model = joblib.load(weather_model_path)
                
        except Exception as e:
            print(f"Error loading ML models: {e}")
    
    def predict_tire_degradation(self, telemetry_data):
        """Predict tire degradation using your trained model"""
        if not self.tire_model:
            return self._fallback_tire_prediction(telemetry_data)
        
        try:
            # Prepare features for your tire model
            features = self._prepare_tire_features(telemetry_data)
            prediction = self.tire_model.predict(features)
            return prediction
        except Exception as e:
            print(f"Tire prediction error: {e}")
            return self._fallback_tire_prediction(telemetry_data)
    
    def predict_pit_strategy(self, race_data):
        """Predict optimal pit strategy using your trained model"""
        if not self.pit_strategy_model:
            return self._fallback_pit_prediction(race_data)
        
        try:
            # Prepare features for your pit strategy model
            features = self._prepare_pit_features(race_data)
            prediction = self.pit_strategy_model.predict(features)
            confidence = self.pit_strategy_model.predict_proba(features)
            return prediction, confidence
        except Exception as e:
            print(f"Pit strategy prediction error: {e}")
            return self._fallback_pit_prediction(race_data)
    
    def _prepare_tire_features(self, telemetry_data):
        """Prepare features for tire degradation model"""
        # Implement feature preparation based on your tire_trainer.py
        features = []
        return np.array(features)
    
    def _prepare_pit_features(self, race_data):
        """Prepare features for pit strategy model"""
        # Implement feature preparation based on your pit_strategy_trainer.py
        features = []
        return np.array(features)
    
    def _fallback_tire_prediction(self, telemetry_data):
        """Fallback tire prediction when model is unavailable"""
        return {
            'degradation_s1': 0.05,
            'degradation_s2': 0.05,
            'degradation_s3': 0.05,
            'grip_loss_rate': 0.1,
            'predicted_laps_remaining': 15
        }
    
    def _fallback_pit_strategy_prediction(self, race_data):
        """Fallback pit strategy prediction"""
        return 'MIDDLE', 0.7