"""
Loads the trained models once per process and keeps them in memory.

Source, in order of preference:
  1. Supabase Storage: <prefix>/latest/manifest.json, then each model file
     from the run's storage_prefix (cached on disk under ML_MODELS_DIR/runs/<run_id>)
  2. The last successfully downloaded manifest (if Supabase is unreachable)
  3. A manifest.json placed directly in ML_MODELS_DIR (local development)

A model is served only if its manifest entry is status "trained", it beats the
baseline (ML_REQUIRE_BEATS_BASELINE), its scikit-learn/numpy versions match
the installed ones, its sha256 matches, and every feature it needs is
computable (strategy.ml_features). Anything else is logged and skipped, and
StrategyMLModels falls back to heuristics for that prediction.
"""
import hashlib
import json
import logging
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

import joblib
import numpy as np
import requests
import sklearn
from django.conf import settings

from .ml_features import unsupported_features

logger = logging.getLogger(__name__)

LATEST_CACHE = "latest_manifest.json"


@dataclass
class LoadedModel:
    name: str
    pipeline: object
    spec: dict
    run_id: str

    @property
    def feature_columns(self):
        return self.spec["feature_columns"]

    @property
    def confidence(self):
        return self.spec.get("metrics", {}).get("serving_confidence")


class ModelRegistry:
    def __init__(self):
        self._lock = threading.RLock()
        self._models: Dict[str, LoadedModel] = {}
        self._manifest: Optional[dict] = None
        self._loaded = False
        self.source = None
        self.skipped: Dict[str, str] = {}
        self.last_error: Optional[str] = None

    # -- public -----------------------------------------------------------

    def ensure_loaded(self):
        if not self._loaded:
            self.refresh()

    def get(self, name) -> Optional[LoadedModel]:
        self.ensure_loaded()
        return self._models.get(name)

    @property
    def run_id(self):
        return self._manifest.get("run_id") if self._manifest else None

    def status(self) -> dict:
        return {
            "run_id": self.run_id,
            "source": self.source,
            "served": sorted(self._models),
            "skipped": dict(self.skipped),
            "last_error": self.last_error,
        }

    def refresh(self, force=False) -> str:
        """(Re)load the latest manifest; returns a short status message."""
        with self._lock:
            self._loaded = True
            if not settings.ML_MODELS_ENABLED:
                self._swap(None, {}, {}, "disabled")
                return "ML models disabled"

            manifest, source = self._fetch_manifest()
            if manifest is None:
                if not self._models:
                    self._swap(None, {}, {}, None)
                return f"No model manifest available ({self.last_error or 'none configured'})"
            load_failed = any(r.startswith("could not load") for r in self.skipped.values())
            if not force and not load_failed and manifest.get("run_id") == self.run_id:
                return f"Models unchanged (run {self.run_id})"

            models, skipped = self._load_models(manifest, source)
            self._swap(manifest, models, skipped, source)
            message = (f"Loaded run {self.run_id} from {source}: serving {sorted(models) or 'none'}"
                       + (f"; skipped {skipped}" if skipped else ""))
            logger.info(message)
            return message

    # -- internals --------------------------------------------------------

    def _swap(self, manifest, models, skipped, source):
        self._manifest, self._models, self.skipped, self.source = manifest, models, skipped, source

    @property
    def _cache_dir(self) -> Path:
        return Path(settings.ML_MODELS_DIR)

    def _supabase_configured(self):
        return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY)

    def _download(self, path) -> bytes:
        key = settings.SUPABASE_SERVICE_KEY
        headers = {"apikey": key}
        if key.startswith("eyJ"):  # legacy JWT service_role key
            headers["Authorization"] = f"Bearer {key}"
        url = (f"{settings.SUPABASE_URL}/storage/v1/object/authenticated/"
               f"{settings.SUPABASE_MODELS_BUCKET}/{path}")
        response = requests.get(url, headers=headers, timeout=60)
        if response.status_code >= 300:
            raise RuntimeError(f"GET {path}: HTTP {response.status_code}")
        return response.content

    def _fetch_manifest(self):
        if self._supabase_configured():
            path = f"{settings.SUPABASE_MODELS_PREFIX}/latest/manifest.json"
            try:
                manifest = json.loads(self._download(path))
                self._cache_dir.mkdir(parents=True, exist_ok=True)
                (self._cache_dir / LATEST_CACHE).write_text(json.dumps(manifest))
                self.last_error = None
                return manifest, "supabase"
            except Exception as exc:
                self.last_error = f"Supabase manifest download failed: {exc}"
                logger.warning(self.last_error)
            cached = self._cache_dir / LATEST_CACHE
            if cached.exists():
                return json.loads(cached.read_text()), "cache"
            return None, None

        local = self._cache_dir / "manifest.json"
        if local.exists():
            return json.loads(local.read_text()), "local"
        return None, None

    def _model_file(self, manifest, spec, source) -> Path:
        if source == "local":
            return self._cache_dir / spec["file"]
        path = self._cache_dir / "runs" / manifest["run_id"] / spec["file"]
        if not path.exists():
            if source != "supabase":
                raise FileNotFoundError(f"{path} not cached and Supabase is unreachable")
            path.parent.mkdir(parents=True, exist_ok=True)
            data = self._download(f"{manifest['storage_prefix']}/{spec['file']}")
            path.write_bytes(data)
        return path

    def _version_problem(self, manifest):
        versions = manifest.get("versions", {})
        for package, installed in (("scikit-learn", sklearn.__version__), ("numpy", np.__version__)):
            trained = versions.get(package, "")
            if trained.split(".")[:2] != installed.split(".")[:2]:
                return f"trained with {package} {trained or '?'}, installed {installed}"
        return None

    def _load_models(self, manifest, source):
        models, skipped = {}, {}
        version_problem = self._version_problem(manifest)
        for name, spec in manifest.get("models", {}).items():
            if spec.get("status") != "trained" or not spec.get("file"):
                skipped[name] = f"status {spec.get('status')}: {spec.get('reason', '')}".strip()
                continue
            if settings.ML_REQUIRE_BEATS_BASELINE and not spec.get("metrics", {}).get("beats_baseline"):
                skipped[name] = "does not beat the baseline in cross-validation"
                continue
            if version_problem:
                skipped[name] = version_problem
                continue
            missing = unsupported_features(spec.get("feature_columns", []))
            if missing:
                skipped[name] = f"needs features the backend cannot compute: {missing}"
                continue
            try:
                path = self._model_file(manifest, spec, source)
                digest = hashlib.sha256(path.read_bytes()).hexdigest()
                if spec.get("sha256") and digest != spec["sha256"]:
                    path.unlink(missing_ok=True)
                    raise ValueError("sha256 mismatch")
                pipeline = joblib.load(path)
            except Exception as exc:
                skipped[name] = f"could not load: {exc}"
                continue
            models[name] = LoadedModel(name, pipeline, spec, manifest["run_id"])
        for name, reason in skipped.items():
            logger.info("Model %s not served: %s", name, reason)
        return models, skipped


_registry = ModelRegistry()


def get_registry() -> ModelRegistry:
    return _registry


def refresh_models() -> str:
    """Background job: pick up a newly published training run."""
    return _registry.refresh()
