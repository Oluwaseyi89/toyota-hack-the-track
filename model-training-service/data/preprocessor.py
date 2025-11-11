import pandas as pd
import numpy as np

class DataPreprocessor:
    @staticmethod
    def preprocess_lap_data(lap_df: pd.DataFrame) -> pd.DataFrame:
        """Clean and prepare lap telemetry data"""
        df = lap_df.copy()
        
        # Convert time strings to seconds
        df['LAP_TIME_SECONDS'] = df['LAP_TIME'].apply(DataPreprocessor.time_to_seconds)
        df['S1_SECONDS'] = df['S1'].apply(DataPreprocessor.time_to_seconds)
        df['S2_SECONDS'] = df['S2'].apply(DataPreprocessor.time_to_seconds)
        df['S3_SECONDS'] = df['S3'].apply(DataPreprocessor.time_to_seconds)
        
        # Calculate performance metrics
        df['PERFORMANCE_DROP'] = df['LAP_TIME_SECONDS'] - df['LAP_TIME_SECONDS'].min()
        df['TIRE_AGE'] = df['LAP_NUMBER']
        
        return df
    
    @staticmethod
    def time_to_seconds(time_str: str) -> float:
        """Convert MM:SS.sss format to seconds"""
        if pd.isna(time_str) or time_str == '':
            return np.nan
        parts = time_str.split(':')
        if len(parts) == 2:
            return float(parts[0]) * 60 + float(parts[1])
        return float(parts[0])