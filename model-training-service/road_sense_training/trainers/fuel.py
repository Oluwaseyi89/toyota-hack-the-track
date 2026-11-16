"""
Fuel consumption model.

The GR Cup timing data has no fuel measurements, so there is no ground truth
to learn from. The previous trainer invented consumption from a formula and
fell back to np.random data; this one reports the model as skipped instead,
and the backend keeps its assumption-based fuel estimate (flagged
is_simulated). If a dataset with fuel columns is added, they are listed in
the reason so a real trainer can be written against them.
"""
from .base import SKIPPED, TrainResult


def train_fuel_model(laps, tracks, random_state: int = 42) -> TrainResult:
    fuel_columns = sorted({
        column for track in tracks for column in track.laps.columns if "FUEL" in column
    })
    if fuel_columns:
        reason = (f"Fuel columns found ({', '.join(fuel_columns)}) but no fuel trainer is "
                  "implemented for them yet; nothing was trained")
    else:
        reason = ("Dataset has no fuel measurements (no column containing 'FUEL'), so there is "
                  "no ground truth; the backend keeps its assumption-based estimate")
    return TrainResult(
        name="fuel_consumption",
        status=SKIPPED,
        task="regression",
        target="fuel_used_liters_per_lap",
        feature_columns=[],
        reason=reason,
    )
