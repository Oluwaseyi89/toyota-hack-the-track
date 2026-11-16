"""
Minimal Supabase Storage client (REST API over requests, no SDK needed).

Layout in the bucket:
  <prefix>/runs/<run_id>/manifest.json, <model>.joblib   (immutable per run)
  <prefix>/latest/manifest.json                           (pointer to the newest run)

The latest manifest is uploaded last, so the backend never sees a manifest
whose model files are not uploaded yet.
"""
import logging
from pathlib import Path

import requests

logger = logging.getLogger(__name__)


class StorageError(RuntimeError):
    pass


class SupabaseStorage:
    def __init__(self, url: str, key: str, bucket: str, timeout: int = 120):
        self.base = f"{url.rstrip('/')}/storage/v1"
        self.bucket = bucket
        self.timeout = timeout
        self.headers = {"apikey": key}
        # Legacy service_role keys are JWTs and go in Authorization too; the
        # newer sb_secret_ keys are sent as `apikey` only.
        if key.startswith("eyJ"):
            self.headers["Authorization"] = f"Bearer {key}"

    def upload(self, path: str, data: bytes, content_type: str) -> None:
        response = requests.post(
            f"{self.base}/object/{self.bucket}/{path}",
            data=data,
            headers={**self.headers, "Content-Type": content_type, "x-upsert": "true"},
            timeout=self.timeout,
        )
        if response.status_code >= 300:
            raise StorageError(f"Upload of {path} failed: HTTP {response.status_code} {response.text[:200]}")

    def download(self, path: str) -> bytes:
        response = requests.get(
            f"{self.base}/object/authenticated/{self.bucket}/{path}",
            headers=self.headers, timeout=self.timeout,
        )
        if response.status_code >= 300:
            raise StorageError(f"Download of {path} failed: HTTP {response.status_code} {response.text[:200]}")
        return response.content

    def publish_run(self, run_dir: Path, manifest: dict, prefix: str) -> None:
        """Upload model files and the run manifest, then move the latest pointer."""
        run_prefix = manifest["storage_prefix"]
        for entry in manifest["models"].values():
            if entry.get("file"):
                path = f"{run_prefix}/{entry['file']}"
                self.upload(path, (run_dir / entry["file"]).read_bytes(), "application/octet-stream")
                logger.info("Uploaded %s", path)
        manifest_bytes = (run_dir / "manifest.json").read_bytes()
        self.upload(f"{run_prefix}/manifest.json", manifest_bytes, "application/json")
        self.upload(f"{prefix}/latest/manifest.json", manifest_bytes, "application/json")
        logger.info("Published run %s as %s/latest", manifest["run_id"], prefix)
