"""
Strategy predictions: trained models when available, heuristics otherwise.

Models are loaded once per process by strategy.model_registry. Every method
returns the same dict shape whichever path produced it:

  "source":       "model" or "heuristic"
  "is_simulated": True for heuristics (not a trained model)
  "model_run_id": training run id when source == "model"
  "confidence":   0..1

plus the prediction fields documented on each method.
"""
import logging

from django.conf import settings

from .ml_features import build_feature_vector
from .model_registry import get_registry

logger = logging.getLogger(__name__)

STRATEGY_TYPES = {"EARLY", "MIDDLE", "LATE", "UNDERCUT", "OVERCUT"}


def _model_meta(model):
    return {"source": "model", "is_simulated": False, "model_run_id": model.run_id}


HEURISTIC = {"source": "heuristic", "is_simulated": True, "model_run_id": None}


class StrategyMLModels:
    def __init__(self, registry=None):
        self.registry = registry or get_registry()
        self.registry.ensure_loaded()

    # -- tire ---------------------------------------------------------------

    def predict_tire_degradation(self, telemetry_data, race_data=None):
        """
        {"grip_loss_rate": s/lap expected over the coming laps,
         "predicted_laps_remaining": laps until the drop-off threshold, ...}
        """
        from .services import build_race_data, estimate_tire_laps_remaining

        if race_data is None:
            race_data = build_race_data(telemetry_data)

        model = self.registry.get("tire_degradation")
        if model is not None:
            try:
                features = build_feature_vector(model.feature_columns, race_data)
                rate = max(0.0, float(model.pipeline.predict(features)[0]))
                return {
                    "grip_loss_rate": round(rate, 4),
                    "predicted_laps_remaining": estimate_tire_laps_remaining(rate, race_data["stint_laps"]),
                    "confidence": model.confidence or 0.5,
                    **_model_meta(model),
                }
            except Exception:
                logger.exception("Tire model prediction failed; using heuristic")

        return {
            "grip_loss_rate": max(0.0, race_data["tire_degradation"]),
            "predicted_laps_remaining": race_data["tire_laps_remaining"],
            "confidence": self._heuristic_confidence(race_data),
            **HEURISTIC,
        }

    # -- pit strategy ---------------------------------------------------------

    def predict_pit_strategy(self, race_data):
        """{"strategy_type": EARLY|MIDDLE|LATE|UNDERCUT|OVERCUT, "probabilities": {...}, ...}"""
        model = self.registry.get("pit_strategy")
        if model is not None:
            try:
                features = build_feature_vector(model.feature_columns, race_data)
                probabilities = model.pipeline.predict_proba(features)[0]
                classes = [str(c) for c in model.pipeline.classes_]
                ranked = sorted(zip(classes, probabilities), key=lambda item: -item[1])
                best, best_probability = next(
                    ((c, p) for c, p in ranked if c in STRATEGY_TYPES), (None, 0.0)
                )
                if best is not None:
                    return {
                        "strategy_type": best,
                        "confidence": round(float(best_probability), 3),
                        "probabilities": {c: round(float(p), 3) for c, p in ranked},
                        **_model_meta(model),
                    }
            except Exception:
                logger.exception("Pit strategy model prediction failed; using heuristic")

        strategy = self._heuristic_pit_strategy(race_data)
        return {
            "strategy_type": strategy,
            "confidence": self._heuristic_confidence(race_data),
            "probabilities": {},
            **HEURISTIC,
        }

    # -- weather --------------------------------------------------------------

    def predict_weather_impact(self, race_data):
        """
        {"impact_fraction": share of lap time lost (+) or gained (-) due to the
         current weather versus typical conditions, ...}, or None without a model.
        """
        model = self.registry.get("weather_impact")
        if model is None or not race_data.get("weather"):
            return None
        try:
            reference = model.spec.get("details", {}).get("reference_conditions") or {}
            current = build_feature_vector(model.feature_columns, race_data)
            baseline = build_feature_vector(model.feature_columns, race_data, overrides=reference)
            impact = float(model.pipeline.predict(current)[0] - model.pipeline.predict(baseline)[0])
            return {
                "impact_fraction": round(impact, 5),
                "confidence": model.confidence or 0.5,
                **_model_meta(model),
            }
        except Exception:
            logger.exception("Weather model prediction failed")
            return None

    # -- heuristics -----------------------------------------------------------

    @staticmethod
    def _heuristic_pit_strategy(race_data):
        """Tire/fuel windows and traffic, used until a trained model is served."""
        window = min(
            race_data.get("tire_laps_remaining", 15),
            race_data.get("fuel_laps_remaining", 15),
        )
        gap_ahead = race_data.get("gap_to_car_ahead")
        degradation = race_data.get("tire_degradation", 0.0)

        if gap_ahead is not None and gap_ahead < 1.5 and window <= 8:
            return "UNDERCUT"   # close behind: pit first, use fresh tires
        if gap_ahead is not None and gap_ahead > 3.0 and degradation < 0.05 and window > 8:
            return "OVERCUT"    # clear air and tires holding up: stay out
        if window <= 3:
            return "EARLY"
        if window <= 10:
            return "MIDDLE"
        return "LATE"

    @staticmethod
    def _heuristic_confidence(race_data):
        """Grows with the number of laps measured; capped low for heuristics."""
        laps = race_data.get("laps_in_sample", 0)
        return round(min(0.6, 0.3 + 0.03 * laps), 2)

    def status(self):
        return {**self.registry.status(), "enabled": settings.ML_MODELS_ENABLED}
