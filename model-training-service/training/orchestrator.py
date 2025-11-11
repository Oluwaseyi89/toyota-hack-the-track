from models.tire_trainer import TireModelTrainer
from models.fuel_trainer import FuelModelTrainer
from models.pit_strategy_trainer import PitStrategyTrainer
from data.firebase_loader import FirebaseDataLoader
from data.preprocessor import DataPreprocessor
import pandas as pd

import logging

class TrainingOrchestrator:
    def __init__(self, storage):
        self.storage = storage
        self.logger = logging.getLogger(__name__)
    
    def train_all_models(self) -> dict:
        """Orchestrate training of all models"""
        self.logger.info("📥 Loading training data...")
        
        # Load data from Firebase
        tracks = ['barber-motorsports-park', 'circuit-of-the-americas', 'indianapolis']
        all_data = self.storage.load_all_tracks(tracks)
        
        # Preprocess data
        preprocessor = DataPreprocessor()
        processed_data = {}
        
        for track, data in all_data.items():
            processed_data[track] = {
                'lap_data': preprocessor.preprocess_lap_data(data['lap_data']),
                'race_data': data['race_data'],
                'weather_data': data['weather_data']
            }
        
        # Train models
        self.logger.info("🏃 Training models...")
        
        tire_trainer = TireModelTrainer()
        fuel_trainer = FuelModelTrainer()
        pit_trainer = PitStrategyTrainer()
        
        # Combine data from all tracks
        combined_lap_data = pd.concat([data['lap_data'] for data in processed_data.values()])
        
        models = {
            'tire_degradation': tire_trainer.train(combined_lap_data),
            'fuel_consumption': fuel_trainer.train(combined_lap_data),
            'pit_strategy': pit_trainer.train(processed_data)
        }
        
        # Save models
        self.logger.info("💾 Saving models...")
        for name, result in models.items():
            result['model'].save_model(f"outputs/models/{name}.pkl")
        
        self.logger.info(f"✅ Trained {len(models)} models successfully")
        return models