"""
Simulated race feed used until a real telemetry source is connected.

Every tick each simulated car completes one lap. Lap times follow a per-car
base pace plus tire degradation over the stint and random noise; cars pit when
their tires or fuel run out. Positions and gaps come from cumulative race
time. All rows are saved with is_simulated=True, and the state is read back
from the database each tick, so the race continues across restarts.
"""
import random
from datetime import timedelta

from django.conf import settings
from django.db import transaction

from .models import TelemetryData, TireTelemetry, Vehicle, WeatherData

_rng = random.Random()


def _vehicles(count):
    vehicles = []
    for number in range(1, count + 1):
        vehicle, _ = Vehicle.objects.get_or_create(
            number=number,
            defaults={
                "team": f"Team {number}",
                "driver": f"Driver {number}",
                "vehicle_id": f"GR86-{number:03d}-000",
            },
        )
        vehicles.append(vehicle)
    return vehicles


def _car_profile(number):
    """Deterministic per-car pace so the field has a consistent order."""
    return {
        "base_lap": 85.0 + 0.12 * (number - 1),
        "degradation": 0.035 + 0.01 * (number % 4),
        "max_stint": settings.RACE_ASSUMPTIONS["tire_max_stint_laps"] - (number % 5),
    }


def _race_state(vehicles):
    """Laps done, last pit lap and cumulative time per car in the current race."""
    state = {v.id: {"laps": 0, "last_pit": 0, "total": 0.0} for v in vehicles}
    rows = TelemetryData.objects.filter(
        is_simulated=True, vehicle__in=vehicles,
    ).values_list("vehicle_id", "lap_number", "lap_time", "is_pit_lap")
    for vehicle_id, lap_number, lap_time, is_pit_lap in rows:
        car = state[vehicle_id]
        car["laps"] = max(car["laps"], lap_number)
        car["total"] += lap_time.total_seconds()
        if is_pit_lap:
            car["last_pit"] = max(car["last_pit"], lap_number)
    return state


def _next_lap(vehicle, car):
    a = settings.RACE_ASSUMPTIONS
    profile = _car_profile(vehicle.number)
    lap_number = car["laps"] + 1
    stint = lap_number - car["last_pit"]
    fuel_laps_left = int(a["fuel_tank_liters"] // a["fuel_per_lap_liters"]) - stint

    racing_time = profile["base_lap"] + profile["degradation"] * stint + _rng.gauss(0, 0.25)
    is_pit_lap = stint >= profile["max_stint"] or fuel_laps_left <= 1
    lap_time = racing_time + (a["pit_loss_seconds"] if is_pit_lap else 0.0)

    return {
        "lap_number": lap_number,
        "stint": stint,
        "lap_time": lap_time,
        "sectors": (racing_time * 0.35, racing_time * 0.33,
                    racing_time * 0.32 + (lap_time - racing_time)),
        "is_pit_lap": is_pit_lap,
    }


def advance_race(vehicle_count=None, race_laps=None):
    """Simulate one lap for every car. Returns the number of laps written."""
    vehicle_count = vehicle_count or settings.SIMULATION_VEHICLE_COUNT
    race_laps = race_laps or settings.SIMULATION_RACE_LAPS
    vehicles = _vehicles(vehicle_count)
    state = _race_state(vehicles)

    if max(car["laps"] for car in state.values()) >= race_laps:
        # Chequered flag: clear the simulated race and start a new one.
        TelemetryData.objects.filter(is_simulated=True).delete()
        state = _race_state(vehicles)

    laps = {v.id: _next_lap(v, state[v.id]) for v in vehicles}
    totals = {v.id: state[v.id]["total"] + laps[v.id]["lap_time"] for v in vehicles}
    order = sorted(vehicles, key=lambda v: totals[v.id])
    leader_total = totals[order[0].id]
    track_km = settings.RACE_ASSUMPTIONS["track_length_km"]

    with transaction.atomic():
        for position, vehicle in enumerate(order, start=1):
            lap = laps[vehicle.id]
            s1, s2, s3 = lap["sectors"]
            telemetry = TelemetryData.objects.create(
                vehicle=vehicle,
                lap_number=lap["lap_number"],
                lap_time=timedelta(seconds=lap["lap_time"]),
                sector1_time=timedelta(seconds=s1),
                sector2_time=timedelta(seconds=s2),
                sector3_time=timedelta(seconds=s3),
                speed=round(track_km / (lap["lap_time"] / 3600), 1),
                rpm=_rng.randint(6500, 7400),
                gear=_rng.randint(3, 6),
                throttle=round(_rng.uniform(60, 100), 1),
                brake=round(_rng.uniform(0, 40), 1),
                position=position,
                gap_to_leader=round(totals[vehicle.id] - leader_total, 3),
                is_pit_lap=lap["is_pit_lap"],
                is_simulated=True,
            )
            heat = 85 + lap["stint"] * 0.8
            TireTelemetry.objects.create(
                telemetry=telemetry,
                front_left_temp=round(heat + _rng.gauss(0, 3), 1),
                front_right_temp=round(heat + 2 + _rng.gauss(0, 3), 1),
                rear_left_temp=round(heat - 5 + _rng.gauss(0, 3), 1),
                rear_right_temp=round(heat - 4 + _rng.gauss(0, 3), 1),
                front_left_pressure=round(26.0 + lap["stint"] * 0.03 + _rng.gauss(0, 0.2), 2),
                front_right_pressure=round(26.0 + lap["stint"] * 0.03 + _rng.gauss(0, 0.2), 2),
                rear_left_pressure=round(24.5 + lap["stint"] * 0.03 + _rng.gauss(0, 0.2), 2),
                rear_right_pressure=round(24.5 + lap["stint"] * 0.03 + _rng.gauss(0, 0.2), 2),
            )
    return len(order)


def advance_weather():
    """Random-walk the weather from its last reading (simulated)."""
    last = WeatherData.objects.order_by("-timestamp", "-id").first()

    def walk(value, step, low, high):
        return round(min(high, max(low, value + _rng.uniform(-step, step))), 2)

    if last is None:
        values = dict(track_temperature=35.0, air_temperature=24.0, humidity=50.0,
                      pressure=1013.0, wind_speed=5.0, wind_direction=180.0, rainfall=0.0)
    else:
        values = dict(
            track_temperature=walk(last.track_temperature, 1.5, 15, 55),
            air_temperature=walk(last.air_temperature, 0.8, 10, 40),
            humidity=walk(last.humidity, 3, 20, 100),
            pressure=walk(last.pressure, 0.5, 990, 1030),
            wind_speed=walk(last.wind_speed, 1.0, 0, 25),
            wind_direction=round((last.wind_direction + _rng.uniform(-15, 15)) % 360, 1),
            # Rain is rare: mostly dry, occasionally a shower that fades.
            rainfall=walk(last.rainfall * 0.7 + (_rng.random() < 0.05) * 2.0, 0.2, 0, 10),
        )
    return WeatherData.objects.create(**values, is_simulated=True)
