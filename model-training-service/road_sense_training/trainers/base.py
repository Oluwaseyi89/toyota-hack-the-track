"""
Shared training utilities: the result type, pipeline factories and
cross-validation that holds out whole tracks, so metrics reflect how a model
does on a circuit it has never seen, compared against a naive baseline.
"""
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, r2_score
from sklearn.model_selection import GroupKFold, KFold, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

TRAINED = "trained"
INSUFFICIENT_DATA = "insufficient_data"
SKIPPED = "skipped"
FAILED = "failed"


@dataclass
class TrainResult:
    name: str
    status: str
    task: str
    target: str
    feature_columns: List[str]
    reason: str = ""
    pipeline: Any = None
    label_classes: Optional[List[str]] = None
    metrics: Dict[str, Any] = field(default_factory=dict)
    n_samples: int = 0
    details: Dict[str, Any] = field(default_factory=dict)
    # Always False: trainers never fall back to generated data.
    synthetic: bool = False


def regression_pipeline(random_state: int) -> Pipeline:
    return Pipeline([
        ("impute", SimpleImputer(strategy="median", keep_empty_features=True)),
        ("scale", StandardScaler()),
        ("model", RandomForestRegressor(
            n_estimators=300, min_samples_leaf=5, n_jobs=-1, random_state=random_state,
        )),
    ])


def classification_pipeline(random_state: int) -> Pipeline:
    return Pipeline([
        ("impute", SimpleImputer(strategy="median", keep_empty_features=True)),
        ("scale", StandardScaler()),
        ("model", RandomForestClassifier(
            n_estimators=300, min_samples_leaf=2, class_weight="balanced",
            n_jobs=-1, random_state=random_state,
        )),
    ])


def _splits(groups, y=None, classification=False, random_state=42):
    unique_groups = np.unique(groups)
    if len(unique_groups) >= 3:
        k = min(5, len(unique_groups))
        return list(GroupKFold(n_splits=k).split(np.zeros(len(groups)), groups=groups)), \
            f"group_kfold_by_track(k={k})"
    note = "not grouped: fewer than 3 tracks, so metrics are optimistic"
    if classification:
        k = max(2, min(5, int(np.bincount(np.unique(y, return_inverse=True)[1]).min())))
        splitter = StratifiedKFold(n_splits=k, shuffle=True, random_state=random_state)
        return list(splitter.split(np.zeros(len(y)), y)), f"stratified_kfold(k={k}); {note}"
    splitter = KFold(n_splits=5, shuffle=True, random_state=random_state)
    return list(splitter.split(np.zeros(len(groups)))), f"kfold(k=5); {note}"


def evaluate_regressor(make_pipeline: Callable[[], Pipeline], X, y, groups, random_state=42) -> Dict:
    splits, scheme = _splits(groups, random_state=random_state)
    predictions = np.empty(len(y))
    baseline = np.empty(len(y))
    for train, test in splits:
        pipeline = make_pipeline()
        pipeline.fit(X[train], y[train])
        predictions[test] = pipeline.predict(X[test])
        baseline[test] = y[train].mean()
    mae = float(mean_absolute_error(y, predictions))
    baseline_mae = float(mean_absolute_error(y, baseline))
    r2 = float(r2_score(y, predictions))
    return {
        "cv_scheme": scheme,
        "cv_mae": round(mae, 5),
        "cv_r2": round(r2, 4),
        "baseline_mae": round(baseline_mae, 5),
        "beats_baseline": mae < baseline_mae,
        # Confidence reported with each served prediction.
        "serving_confidence": round(float(np.clip(r2, 0.1, 0.9)), 3),
    }


def evaluate_classifier(make_pipeline: Callable[[], Pipeline], X, y, groups, weights, random_state=42) -> Dict:
    splits, scheme = _splits(groups, y=y, classification=True, random_state=random_state)
    predictions = np.empty(len(y), dtype=object)
    baseline = np.empty(len(y), dtype=object)
    for train, test in splits:
        pipeline = make_pipeline()
        pipeline.fit(X[train], y[train], model__sample_weight=weights[train])
        predictions[test] = pipeline.predict(X[test])
        values, counts = np.unique(y[train], return_counts=True)
        baseline[test] = values[np.argmax(counts)]
    accuracy = float(accuracy_score(y, predictions))
    baseline_accuracy = float(accuracy_score(y, baseline))
    labels, support = np.unique(y, return_counts=True)
    return {
        "cv_scheme": scheme,
        "cv_accuracy": round(accuracy, 4),
        "cv_macro_f1": round(float(f1_score(y, predictions, average="macro", zero_division=0)), 4),
        "baseline_accuracy": round(baseline_accuracy, 4),
        "beats_baseline": accuracy > baseline_accuracy,
        "class_support": {str(label): int(count) for label, count in zip(labels, support)},
    }
