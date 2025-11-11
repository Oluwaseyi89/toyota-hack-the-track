# utils/data_processor.py
import pandas as pd
import numpy as np

class TelemetryProcessor:
    def calculate_tire_wear(self, batch_data: dict) -> float:
        # Simple tire wear calculation based on distance and forces
        distance = batch_data.get('distance', 0)
        lateral_force = batch_data.get('lateral_force', 1.0)
        return min(100.0, distance * lateral_force * 0.001)
    
    def calculate_fuel_usage(self, batch_data: dict) -> float:
        # Fuel consumption based on RPM and throttle
        rpm = batch_data.get('rpm', 8000)
        throttle = batch_data.get('throttle', 0.8)
        return max(0, batch_data.get('fuel_remaining', 100) - (rpm * throttle * 0.0001))
    
    def analyze_pace(self, batch_data: dict) -> dict:
        # Pace analysis comparing to optimal lap
        current_lap_time = batch_data.get('lap_time', 90.0)
        optimal_lap_time = batch_data.get('optimal_lap', 85.0)
        return {
            'pace_delta': current_lap_time - optimal_lap_time,
            'pace_degradation': max(0, (current_lap_time - optimal_lap_time) / optimal_lap_time)
        }