from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import pandas as pd
import joblib

class TireModelTrainer:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
    
    def train(self, lap_data: pd.DataFrame) -> dict:
        """Train tire degradation model"""
        # Prepare features
        features = ['LAP_NUMBER', 'S1_SECONDS', 'S2_SECONDS', 'S3_SECONDS']
        X = lap_data[features].dropna()
        y = lap_data.loc[X.index, 'LAP_TIME_SECONDS']
        
        # Train model
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
        self.model.fit(X_train, y_train)
        
        # Evaluate
        train_score = self.model.score(X_train, y_train)
        test_score = self.model.score(X_test, y_test)
        
        return {
            'model': self.model,
            'features': features,
            'train_score': train_score,
            'test_score': test_score
        }
    
    def save_model(self, filepath: str):
        """Save trained model"""
        joblib.dump(self.model, filepath)