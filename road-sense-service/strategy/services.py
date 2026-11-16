"""
Strategy generation shared by the scheduled job and the API views.

Race state is derived from stored telemetry (telemetry.metrics) and is also
the input to the trained models' features (strategy.ml_features). Predictions
come from the trained models when they are served; otherwise StrategyMLModels
falls back to telemetry-based heuristics and the saved rows are flagged
is_simulated=True.
"""
from django.conf import settings

from telemetry import metrics
from telemetry.models import TelemetryData, WeatherData

from .models import FuelStrategy, PitStrategy, TireStrategy


def assumptions():
    return settings.RACE_ASSUMPTIONS


def estimate_fuel(current_lap, last_pit_lap):
    """Fuel left and laps it covers, assuming a full tank at the last stop."""
    a = assumptions()
    laps_on_fuel = current_lap - (last_pit_lap or 0)
    fuel_left = max(0.0, a["fuel_tank_liters"] - laps_on_fuel * a["fuel_per_lap_liters"])
    return {
        "fuel_remaining": round(fuel_left, 2),
        "fuel_laps_remaining": int(fuel_left // a["fuel_per_lap_liters"]),
        "consumption_rate": a["fuel_per_lap_liters"],
    }


def estimate_tire_laps_remaining(degradation, stint):
    """
    Laps until the cumulative time loss on this set of tires reaches the
    drop-off threshold, capped by the maximum stint length.
    """
    a = assumptions()
    by_stint_cap = max(0, a["tire_max_stint_laps"] - stint)
    if degradation <= 0:
        return by_stint_cap
    lost_so_far = degradation * stint
    by_drop_off = max(0, int((a["tire_drop_off_seconds"] - lost_so_far) / degradation))
    return min(by_drop_off, by_stint_cap)


def latest_weather():
    weather = WeatherData.objects.order_by("-timestamp", "-id").first()
    if weather is None:
        return {}
    return {
        "track_temperature": weather.track_temperature,
        "air_temperature": weather.air_temperature,
        "humidity": weather.humidity,
        "pressure": weather.pressure,
        "wind_speed": weather.wind_speed,
        "rainfall": weather.rainfall,
        "is_simulated": weather.is_simulated,
    }


def build_race_data(telemetry, snapshot=None):
    """
    Current race state for one car, computed from its stored laps. Keys used
    as model features are mapped in strategy.ml_features.
    """
    vehicle = telemetry.vehicle
    pit_lap = metrics.last_pit_lap(vehicle, before_lap=telemetry.lap_number)
    stint = telemetry.lap_number - (pit_lap or 0)
    stint_history = metrics.recent_laps(vehicle, limit=10, current_stint_only=True)
    degradation = metrics.lap_time_trend(stint_history)
    fuel = estimate_fuel(telemetry.lap_number, pit_lap)
    tire_laps_remaining = estimate_tire_laps_remaining(max(degradation, 0.0), stint)

    if telemetry.position <= 4:
        track_position = "front"
    elif telemetry.position <= 15:
        track_position = "midfield"
    else:
        track_position = "back"

    best = metrics.best_stint_lap_time(vehicle, telemetry.lap_number)
    lap_seconds = metrics.lap_seconds(telemetry)

    return {
        "vehicle_id": vehicle.vehicle_id,
        "current_lap": telemetry.lap_number,
        "race_progress": min(1.0, telemetry.lap_number / max(1, settings.RACE_TOTAL_LAPS)),
        "position": telemetry.position,
        "gap_to_leader": telemetry.gap_to_leader,
        "gap_to_car_ahead": metrics.gap_to_car_ahead(telemetry, snapshot),
        "gap_to_car_behind": metrics.gap_to_car_behind(telemetry, snapshot),
        "last_pit_lap": pit_lap,
        "stint_laps": stint,
        "laps_in_sample": len(metrics.clean_laps(stint_history)),
        "tire_degradation": round(degradation, 4),
        "tire_laps_remaining": tire_laps_remaining,
        "average_lap_time": metrics.average_lap_time(stint_history),
        "delta_to_stint_best": (lap_seconds - best) if best is not None else None,
        "weather": latest_weather(),
        "track_position": track_position,
        "is_simulated_input": telemetry.is_simulated,
        **fuel,
    }


def recommended_pit_lap(race_data, strategy_type):
    """Lap to pit on, based on how long the tires and fuel will last."""
    window = max(1, min(race_data["tire_laps_remaining"], race_data["fuel_laps_remaining"]))
    offsets = {
        "UNDERCUT": 1,
        "EARLY": max(1, window // 3),
        "MIDDLE": max(1, window // 2),
        "LATE": window,
        "OVERCUT": window,
    }
    return race_data["current_lap"] + offsets.get(strategy_type, window)


def generate_vehicle_strategy(telemetry, ml_models, snapshot=None):
    """
    Create/refresh pit, tire and fuel strategies for one car.
    Returns (pit_strategy, tire_strategy, fuel_strategy).
    """
    vehicle = telemetry.vehicle
    race_data = build_race_data(telemetry, snapshot)

    pit_prediction = ml_models.predict_pit_strategy(race_data)
    tire_prediction = ml_models.predict_tire_degradation(telemetry, race_data)
    strategy_type = pit_prediction["strategy_type"]
    # Simulated if a heuristic was used or the input laps are simulated.
    simulated = (pit_prediction["is_simulated"] or tire_prediction["is_simulated"]
                 or race_data["is_simulated_input"])
    sources = f"pit: {pit_prediction['source']}, tire: {tire_prediction['source']}"
    if pit_prediction["model_run_id"] or tire_prediction["model_run_id"]:
        sources += f", run {pit_prediction['model_run_id'] or tire_prediction['model_run_id']}"

    pit_strategy, _ = PitStrategy.objects.update_or_create(
        vehicle=vehicle,
        is_active=True,
        defaults={
            "recommended_lap": recommended_pit_lap(race_data, strategy_type),
            "confidence": round(float(pit_prediction["confidence"]), 3),
            "strategy_type": strategy_type,
            "reasoning": (
                f"Lap {race_data['current_lap']}, P{race_data['position']}: "
                f"{race_data['stint_laps']} laps on tires, "
                f"degradation {race_data['tire_degradation']:+.3f}s/lap, "
                f"~{race_data['tire_laps_remaining']} tire laps and "
                f"~{race_data['fuel_laps_remaining']} fuel laps left ({sources})."
            ),
            "is_simulated": simulated,
        },
    )

    tire_laps = int(tire_prediction["predicted_laps_remaining"])
    tire_strategy = TireStrategy.objects.create(
        vehicle=vehicle,
        predicted_laps_remaining=tire_laps,
        degradation_rate=float(tire_prediction["grip_loss_rate"]),
        optimal_change_lap=race_data["current_lap"] + tire_laps,
        confidence=round(float(tire_prediction["confidence"]), 3),
        is_simulated=simulated,
    )

    fuel_strategy = FuelStrategy.objects.create(
        vehicle=vehicle,
        current_fuel=race_data["fuel_remaining"],
        predicted_laps_remaining=race_data["fuel_laps_remaining"],
        consumption_rate=race_data["consumption_rate"],
        need_to_conserve=race_data["fuel_laps_remaining"] < race_data["tire_laps_remaining"],
        # Fuel has no sensor data yet: always derived from assumptions.
        is_simulated=True,
    )

    return pit_strategy, tire_strategy, fuel_strategy


def latest_telemetry_for(vehicle=None):
    queryset = TelemetryData.objects.select_related("vehicle").order_by("-timestamp", "-id")
    if vehicle is not None:
        queryset = queryset.filter(vehicle=vehicle)
    return queryset.first()
