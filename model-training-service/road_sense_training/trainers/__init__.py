"""Model trainers. Each returns a TrainResult and never trains on generated data."""
from .base import FAILED, INSUFFICIENT_DATA, SKIPPED, TRAINED, TrainResult
from .fuel import train_fuel_model
from .pit_strategy import train_pit_strategy_model
from .tire import train_tire_model
from .weather import train_weather_model

TRAINERS = {
    "tire_degradation": train_tire_model,
    "pit_strategy": train_pit_strategy_model,
    "weather_impact": train_weather_model,
    "fuel_consumption": train_fuel_model,
}

__all__ = [
    "TRAINERS", "TrainResult", "TRAINED", "INSUFFICIENT_DATA", "SKIPPED", "FAILED",
]
