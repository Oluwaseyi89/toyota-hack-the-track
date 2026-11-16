"""
Train all Road Sense models and (optionally) publish them to Supabase Storage.

  python -m road_sense_training.train --data-dir /kaggle/input --upload

Exit codes: 0 = at least one model trained (and published if --upload),
1 = nothing trained (nothing published), 2 = configuration/dataset error.
"""
import argparse
import json
import logging
import sys
import traceback

import pandas as pd

from .artifacts import installed_versions, new_run_id, write_run
from .config import PINNED_VERSIONS, TrainingConfig
from .data_loader import DatasetError, load_tracks
from .laps import build_lap_table
from .supabase_storage import StorageError, SupabaseStorage
from .trainers import FAILED, TRAINED, TRAINERS, TrainResult

logger = logging.getLogger("road_sense_training")


def check_versions(allow_mismatch: bool) -> list:
    installed = installed_versions()
    problems = []
    for package, pinned in PINNED_VERSIONS.items():
        actual = installed[package]
        if not (actual == pinned or actual.startswith(pinned + ".")):
            problems.append(f"{package} {actual} (pinned {pinned})")
    if problems:
        message = ("Installed versions differ from the pinned serving versions: "
                   + ", ".join(problems)
                   + ". The backend will refuse to load models built with other library versions.")
        if not allow_mismatch:
            raise SystemExit(f"ERROR: {message} Install requirements.txt or pass --allow-version-mismatch.")
        logger.warning(message)
    return problems


def run(config: TrainingConfig, model_names, upload: bool) -> int:
    try:
        tracks = load_tracks(config.data_dir)
    except DatasetError as exc:
        logger.error("%s", exc)
        return 2

    frames, summaries = [], []
    for track in tracks:
        try:
            laps, summary = build_lap_table(track)
        except ValueError as exc:
            logger.warning("Skipping %s: %s", track.name, exc)
            summaries.append({"track": track.name, "error": str(exc)})
            continue
        frames.append(laps)
        summaries.append(summary)
    if not frames:
        logger.error("No track could be turned into a lap table")
        return 2
    laps = pd.concat(frames, ignore_index=True)

    results = []
    for name in model_names:
        logger.info("Training %s ...", name)
        try:
            result = TRAINERS[name](laps, tracks, config.random_state)
        except Exception as exc:  # report, never substitute fake data
            logger.error("Training %s failed:\n%s", name, traceback.format_exc())
            result = TrainResult(name=name, status=FAILED, task="", target="",
                                 feature_columns=[], reason=f"{type(exc).__name__}: {exc}")
        logger.info("%s: %s %s %s", name, result.status, result.reason, json.dumps(result.metrics))
        results.append(result)

    run_id = new_run_id()
    run_dir = config.output_dir / run_id
    dataset = {"source_dir": str(config.data_dir), "tracks": summaries, "lap_rows": int(len(laps))}
    manifest = write_run(run_dir, run_id, results, dataset, config.storage_prefix)
    logger.info("Wrote run %s to %s", run_id, run_dir)

    trained = [r.name for r in results if r.status == TRAINED]
    if not trained:
        logger.error("No model trained; nothing will be published. See %s/manifest.json", run_dir)
        return 1

    if upload:
        if not config.can_upload:
            logger.error("--upload needs SUPABASE_URL and SUPABASE_SERVICE_KEY")
            return 2
        try:
            SupabaseStorage(config.supabase_url, config.supabase_key, config.bucket) \
                .publish_run(run_dir, manifest, config.storage_prefix)
        except StorageError as exc:
            logger.error("%s", exc)
            return 2

    print(json.dumps({
        "run_id": run_id,
        "run_dir": str(run_dir),
        "published": bool(upload),
        "models": {n: {"status": e["status"], "reason": e["reason"], "metrics": e["metrics"]}
                   for n, e in manifest["models"].items()},
    }, indent=2))
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data-dir", help="Folder containing the race CSVs (default: /kaggle/input)")
    parser.add_argument("--output-dir", help="Where run folders are written")
    parser.add_argument("--models", default=",".join(TRAINERS), help="Comma-separated subset to train")
    parser.add_argument("--upload", action="store_true", help="Publish to Supabase Storage")
    parser.add_argument("--allow-version-mismatch", action="store_true",
                        help="Train even if library versions differ from the pinned serving versions")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    model_names = [m.strip() for m in args.models.split(",") if m.strip()]
    unknown = sorted(set(model_names) - set(TRAINERS))
    if unknown:
        parser.error(f"unknown models: {', '.join(unknown)}")

    check_versions(args.allow_version_mismatch)
    config = TrainingConfig.from_env(args.data_dir, args.output_dir)
    return run(config, model_names, args.upload)


if __name__ == "__main__":
    sys.exit(main())
