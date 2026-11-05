"""
Analytics computed from stored telemetry, shared by the scheduled jobs and the
API views. Values that depend on assumptions (fuel mass, weather sensitivity,
pit loss) rather than measurements are saved with is_simulated=True.
"""
import random
from statistics import fmean

from django.conf import settings
from django.utils import timezone

from strategy.services import build_race_data
from telemetry import metrics
from telemetry.models import WeatherData

from .models import CompetitorAnalysis, PerformanceAnalysis, RaceSimulation

STRATEGIES = ["EARLY", "MIDDLE", "LATE", "UNDERCUT", "OVERCUT"]
WEATHER_FACTORS = {
    # (pace multiplier, degradation multiplier)
    "dry": (1.0, 1.0),
    "mixed": (1.03, 1.3),
    "wet": (1.08, 0.7),
}


def assumptions():
    return settings.RACE_ASSUMPTIONS


# ---------------------------------------------------------------------------
# Performance analysis
# ---------------------------------------------------------------------------

def _weather_time_cost():
    """Seconds per lap lost to track temperature and rain, from latest weather."""
    weather = WeatherData.objects.order_by("-timestamp", "-id").first()
    if weather is None:
        return 0.0
    a = assumptions()
    temp_cost = abs(weather.track_temperature - a["track_temp_optimal_c"]) * a["track_temp_cost_s_per_c"]
    rain_cost = weather.rainfall * a["rain_cost_s_per_mm"]
    return temp_cost + rain_cost


def analyze_vehicle_performance(telemetry, snapshot=None):
    """
    Build a PerformanceAnalysis for one car. Impacts are fractions of the
    average lap time (0.01 = 1% slower), matching how the dashboard shows them.
    """
    race_data = build_race_data(telemetry, snapshot)
    laps = metrics.recent_laps(telemetry.vehicle, limit=10, current_stint_only=True)
    average = race_data["average_lap_time"] or metrics.lap_seconds(telemetry)
    a = assumptions()

    tire_loss = max(0.0, race_data["tire_degradation"]) * race_data["stint_laps"]
    fuel_loss = race_data["fuel_remaining"] * a["fuel_time_cost_s_per_liter"]
    weather_loss = _weather_time_cost()

    last_clean = next(iter(metrics.clean_laps(laps)), telemetry)
    predicted_next = metrics.lap_seconds(last_clean) + race_data["tire_degradation"]

    return PerformanceAnalysis.objects.create(
        vehicle=telemetry.vehicle,
        lap_number=telemetry.lap_number,
        sector_times=metrics.sector_averages(laps),
        tire_degradation_impact=round(tire_loss / average, 4),
        fuel_impact=round(fuel_loss / average, 4),
        weather_impact=round(weather_loss / average, 4),
        predicted_lap_time=round(predicted_next, 3),
        actual_lap_time=round(metrics.lap_seconds(telemetry), 3),
        # Fuel and weather costs always come from assumptions (there are no
        # fuel sensors and no weather model yet), so this is always simulated.
        is_simulated=True,
    )


# ---------------------------------------------------------------------------
# Competitor analysis
# ---------------------------------------------------------------------------

def threat_level(telemetry):
    if telemetry.position <= 3 and telemetry.gap_to_leader < 3.0:
        return "HIGH"
    if telemetry.position <= 8 and telemetry.gap_to_leader < 10.0:
        return "MEDIUM"
    return "LOW"


def analyze_competitor(telemetry, snapshot=None):
    race_data = build_race_data(telemetry, snapshot)
    trend = race_data["tire_degradation"]
    if trend < -0.05:
        lap_trend = "improving"
    elif trend > 0.05:
        lap_trend = "degrading"
    else:
        lap_trend = "stable"

    return CompetitorAnalysis.objects.create(
        vehicle=telemetry.vehicle,
        lap_number=telemetry.lap_number,
        competitor_data={
            "position": telemetry.position,
            "gap_to_leader": telemetry.gap_to_leader,
            "gap_to_car_ahead": race_data["gap_to_car_ahead"],
            "recent_lap_trend": lap_trend,
            "lap_time_trend_s_per_lap": trend,
            "tire_age": race_data["stint_laps"],
            "last_pit_lap": race_data["last_pit_lap"],
        },
        threat_level=threat_level(telemetry),
        is_simulated=telemetry.is_simulated,
    )


# ---------------------------------------------------------------------------
# Race simulation (Monte Carlo strategy comparison)
# ---------------------------------------------------------------------------

def _pit_lap_for(strategy, race_data, remaining):
    """Laps from now at which each strategy stops (always 1..remaining)."""
    tire_window = max(1, race_data["tire_laps_remaining"])
    options = {
        "EARLY": round(remaining * 0.25),
        "MIDDLE": round(remaining * 0.5),
        "LATE": round(remaining * 0.75),
        "UNDERCUT": tire_window - 2,
        "OVERCUT": tire_window + 2,
    }
    return min(max(1, options[strategy]), remaining)


def _race_time(rng, base, degradation, stint_now, remaining, pit_in, pit_loss, sigma):
    """Total time for the remaining laps with one stop after `pit_in` laps."""
    total, stint = 0.0, stint_now
    for lap in range(1, remaining + 1):
        stint += 1
        total += base + degradation * stint + rng.gauss(0, sigma)
        if lap == pit_in:
            total += pit_loss
            stint = 0
    return total


def simulate_race(telemetry, parameters=None, runs=200, seed=None, snapshot=None):
    """
    Compare the five pit strategies for one car over the remaining laps using
    its measured pace and degradation, with lap-to-lap noise. Returns the
    results dict stored on RaceSimulation.
    """
    parameters = parameters or {}
    a = assumptions()
    snapshot = snapshot if snapshot is not None else list(metrics.latest_per_vehicle())
    race_data = build_race_data(telemetry, snapshot)
    rng = random.Random(seed)

    total_laps = int(parameters.get("duration_laps", settings.SIMULATION_RACE_LAPS))
    remaining = max(1, total_laps - telemetry.lap_number)
    pace_factor, degradation_factor = WEATHER_FACTORS.get(parameters.get("weather", "dry"), (1.0, 1.0))
    pit_loss = a["pit_loss_seconds"] * (0.5 if parameters.get("scenario") == "safety_car" else 1.0)

    base = (race_data["average_lap_time"] or metrics.lap_seconds(telemetry)) * pace_factor
    degradation = max(race_data["tire_degradation"], a["min_degradation_s_per_lap"]) * degradation_factor
    laps = metrics.recent_laps(telemetry.vehicle, limit=10, current_stint_only=True)
    sigma = metrics.lap_time_stdev(laps) or 0.3

    pit_laps = {s: _pit_lap_for(s, race_data, remaining) for s in STRATEGIES}
    totals = {s: [] for s in STRATEGIES}
    wins = {s: 0 for s in STRATEGIES}
    for _ in range(runs):
        run = {
            s: _race_time(rng, base, degradation, race_data["stint_laps"], remaining,
                          pit_laps[s], pit_loss, sigma)
            for s in STRATEGIES
        }
        for s, value in run.items():
            totals[s].append(value)
        wins[min(run, key=run.get)] += 1

    means = {s: fmean(values) for s, values in totals.items()}
    best = min(means, key=means.get)

    # Project everyone else with one stop at their own pace to rank the result.
    focus_finish = telemetry.gap_to_leader + means[best]
    ahead = 0
    for other in snapshot:
        if other.vehicle_id == telemetry.vehicle_id:
            continue
        other_laps = metrics.recent_laps(other.vehicle, limit=10, current_stint_only=True)
        other_pace = (metrics.average_lap_time(other_laps) or metrics.lap_seconds(other)) * pace_factor
        if other.gap_to_leader + other_pace * remaining + pit_loss < focus_finish:
            ahead += 1

    return {
        "vehicle_id": telemetry.vehicle.vehicle_id,
        "from_lap": telemetry.lap_number,
        "remaining_laps": remaining,
        "optimal_strategy": best,
        "optimal_pit_lap": telemetry.lap_number + pit_laps[best],
        "predicted_finish_position": ahead + 1,
        "expected_total_time": round(means[best], 2),
        "confidence": round(wins[best] / runs, 3),
        "strategy_comparison": {
            s: {
                "pit_lap": telemetry.lap_number + pit_laps[s],
                "mean_time": round(means[s], 2),
                "win_rate": round(wins[s] / runs, 3),
            }
            for s in STRATEGIES
        },
        "assumptions": {
            "pit_loss_seconds": pit_loss,
            "degradation_s_per_lap": round(degradation, 4),
            "lap_noise_sigma": round(sigma, 3),
            "weather": parameters.get("weather", "dry"),
            "runs": runs,
        },
    }


def run_and_store_simulation(telemetry, parameters=None, prefix="sim", snapshot=None):
    parameters = dict(parameters or {})
    results = simulate_race(telemetry, parameters, snapshot=snapshot)
    simulation_id = (
        f"{prefix}_{timezone.now().strftime('%Y%m%d_%H%M%S_%f')}_{telemetry.vehicle.number}"
    )
    return RaceSimulation.objects.create(
        simulation_id=simulation_id,
        parameters={**parameters, "vehicle_id": telemetry.vehicle.vehicle_id},
        results=results,
        is_completed=True,
        # A simulation is by definition a projection built on assumptions.
        is_simulated=True,
    )
