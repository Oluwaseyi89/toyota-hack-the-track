"""
Feature contract shared with the serving backend.

Every feature below is computed here from the race timing data AND by
road-sense-service/strategy/ml_features.py from the backend's race_data, with
identical definitions. The manifest stores each model's feature_columns in
order; the backend refuses to serve a model that lists a feature it cannot
compute. Change a definition here only together with the backend.

Definitions (per car, at the end of lap N):
  lap_number            N
  stint_laps            N - (lap of the most recent pit stop at or before N, else 0)
  recent_trend          least-squares slope (s/lap) of clean lap times over the
                        last <=10 laps of the current stint up to N; 0 if <3 clean laps
  recent_avg_lap_time   mean of those clean lap times (s)
  delta_to_stint_best   lap N time minus the best clean lap of the current stint (s)
  race_progress         N / total race laps
  position              running position after lap N
  gap_to_leader         seconds behind the leader after lap N
  gap_to_car_ahead      seconds to the car one position ahead (capped; leader = cap)
  gap_to_car_behind     seconds to the car one position behind (capped; last = cap)
  track_temperature, air_temperature (C), humidity (%), pressure (hPa),
  wind_speed            latest weather reading
  is_raining            1 if rain is reported, else 0

"Clean" laps exclude pit in/out laps, caution laps and outliers (>107% of
the car's median lap), so they reflect pace on the tires.
"""

GAP_CAP_SECONDS = 60.0
TREND_WINDOW_LAPS = 10
MIN_TREND_LAPS = 3

TIRE_FEATURES = [
    "stint_laps",
    "lap_number",
    "recent_trend",
    "recent_avg_lap_time",
    "delta_to_stint_best",
    "track_temperature",
    "air_temperature",
]

PIT_FEATURES = [
    "race_progress",
    "stint_laps",
    "recent_trend",
    "position",
    "gap_to_leader",
    "gap_to_car_ahead",
    "gap_to_car_behind",
    "track_temperature",
]

WEATHER_FEATURES = [
    "track_temperature",
    "air_temperature",
    "humidity",
    "pressure",
    "wind_speed",
    "is_raining",
    "stint_laps",
    "lap_number",
]

WEATHER_COLUMNS = ["track_temperature", "air_temperature", "humidity", "pressure", "wind_speed", "is_raining"]

# Strategy labels must be a subset of the backend's PitStrategy.STRATEGY_TYPES.
STRATEGY_CLASSES = ["EARLY", "MIDDLE", "LATE", "UNDERCUT", "OVERCUT"]
