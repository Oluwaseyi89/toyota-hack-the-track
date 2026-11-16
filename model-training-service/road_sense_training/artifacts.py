"""
Artifact contract.

Each trained model is ONE sklearn Pipeline (imputer + scaler + estimator)
saved with joblib as <name>.joblib, fitted on a plain float array whose
column order is the model's feature_columns. A run directory holds those
files plus manifest.json:

{
  "schema_version": 1,
  "run_id": "20261116T101500Z",
  "trained_at": "...", "versions": {"python", "scikit-learn", "numpy", "joblib", "pandas"},
  "storage_prefix": "models/runs/<run_id>",
  "dataset": {...per-track summaries...},
  "models": {
    "<name>": {
      "status": "trained" | "insufficient_data" | "skipped" | "failed",
      "reason", "task", "target", "file", "sha256", "feature_columns",
      "label_classes", "metrics" (incl. beats_baseline), "n_samples",
      "details", "synthetic": false
    }
  }
}

The backend only serves models with status "trained" whose metrics beat
the baseline, whose sha256 matches and whose library versions match its own.
"""
import hashlib
import json
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

import joblib
import numpy as np
import pandas as pd
import sklearn

from .config import MANIFEST_SCHEMA_VERSION
from .trainers import TRAINED, TrainResult


def installed_versions() -> Dict[str, str]:
    return {
        "python": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "scikit-learn": sklearn.__version__,
        "numpy": np.__version__,
        "joblib": joblib.__version__,
        "pandas": pd.__version__,
        "platform": platform.platform(),
    }


def new_run_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _json_safe(value):
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return None if np.isnan(value) else float(value)
    return value


def write_run(run_dir: Path, run_id: str, results: List[TrainResult], dataset: Dict,
              storage_prefix: str) -> Dict:
    """Save each trained pipeline and the manifest into run_dir; return the manifest."""
    run_dir.mkdir(parents=True, exist_ok=True)
    models = {}
    for result in results:
        entry = {
            "status": result.status,
            "reason": result.reason,
            "task": result.task,
            "target": result.target,
            "feature_columns": result.feature_columns,
            "label_classes": result.label_classes,
            "metrics": result.metrics,
            "n_samples": result.n_samples,
            "details": result.details,
            "synthetic": result.synthetic,
            "file": None,
            "sha256": None,
        }
        if result.status == TRAINED and result.pipeline is not None:
            filename = f"{result.name}.joblib"
            path = run_dir / filename
            joblib.dump(result.pipeline, path, compress=3)
            entry["file"] = filename
            entry["sha256"] = sha256_of(path)
        models[result.name] = entry

    manifest = _json_safe({
        "schema_version": MANIFEST_SCHEMA_VERSION,
        "run_id": run_id,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "versions": installed_versions(),
        "storage_prefix": f"{storage_prefix}/runs/{run_id}",
        "dataset": dataset,
        "models": models,
    })
    (run_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return manifest
