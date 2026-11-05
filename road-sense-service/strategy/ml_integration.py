import joblib
import numpy as np
from django.conf import settings
import os

class StrategyMLModels:
    def __init__(self):
        # Names of predictions ("tire", "pit") served by heuristics instead of
        # a trained model since the last clear(); callers use this to flag
        # results as is_simulated.
        self.fallback_used = set()
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
    
    def predict_tire_degradation(self, telemetry_data, race_data=None):
        """Predict tire degradation; falls back to telemetry-based heuristics."""
        if not self.tire_model:
            return self._fallback_tire_prediction(telemetry_data, race_data)
        
        try:
            features = self._prepare_tire_features(telemetry_data)
            prediction = self.tire_model.predict(features)
            return prediction
        except Exception as e:
            print(f"Tire prediction error: {e}")
            return self._fallback_tire_prediction(telemetry_data, race_data)
    
    def predict_pit_strategy(self, race_data):
        """Predict optimal pit strategy; falls back to telemetry-based heuristics."""
        if not self.pit_strategy_model:
            return self._fallback_pit_prediction(race_data)
        
        try:
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
    
    def _fallback_tire_prediction(self, telemetry_data, race_data=None):
        """
        Heuristic used until a trained tire model is deployed: degradation is
        the lap-time trend over the current stint, measured from telemetry.
        """
        self.fallback_used.add("tire")
        if race_data is None:
            from .services import build_race_data
            race_data = build_race_data(telemetry_data)
        return {
            "grip_loss_rate": max(0.0, race_data["tire_degradation"]),
            "predicted_laps_remaining": race_data["tire_laps_remaining"],
            "confidence": self._heuristic_confidence(race_data),
            "is_simulated": True,
        }
    
    def _fallback_pit_prediction(self, race_data):
        """
        Heuristic used until a trained pit model is deployed. Returns
        (strategy_type, confidence) based on tire/fuel windows and traffic.
        """
        self.fallback_used.add("pit")
        window = min(
            race_data.get("tire_laps_remaining", 15),
            race_data.get("fuel_laps_remaining", 15),
        )
        gap_ahead = race_data.get("gap_to_car_ahead")
        degradation = race_data.get("tire_degradation", 0.0)

        if gap_ahead is not None and gap_ahead < 1.5 and window <= 8:
            strategy = "UNDERCUT"   # close behind: pit first, use fresh tires
        elif gap_ahead is not None and gap_ahead > 3.0 and degradation < 0.05 and window > 8:
            strategy = "OVERCUT"    # clear air and tires holding up: stay out
        elif window <= 3:
            strategy = "EARLY"
        elif window <= 10:
            strategy = "MIDDLE"
        else:
            strategy = "LATE"
        return strategy, self._heuristic_confidence(race_data)

    @staticmethod
    def _heuristic_confidence(race_data):
        """Grows with the number of laps measured; capped low for heuristics."""
        laps = race_data.get("laps_in_sample", 0)
        return round(min(0.6, 0.3 + 0.03 * laps), 2)
