# Road Sense Model Training

Trains the strategy models used by `road-sense-service` from the Toyota GR Cup
race timing data. Training runs on **Kaggle**; the results are published to a
**Supabase Storage** bucket, and the backend downloads the latest run when it starts.

```
Kaggle dataset (CSV) ─► lap table + features ─► train & cross-validate ─► Pipelines + manifest.json
                                                                                │
                                              Supabase Storage  ◄───────────────┘
                                                     │
                                  road-sense-service downloads latest run at startup
```

## Models

| Model | Target (learned from real data) | Served as |
|---|---|---|
| `tire_degradation` | Slope (s/lap) of the car's clean lap times over the next 5 laps of its stint | `grip_loss_rate`, tire laps remaining |
| `pit_strategy` | Label of each **real** pit stop: UNDERCUT / OVERCUT relative to the car ahead or behind (within 3 s, ±5 laps), else EARLY / MIDDLE / LATE by race progress. Stops that held or gained position over the next 5 laps get double weight | recommended strategy + probability |
| `weather_impact` | Lap-time delta (fraction) versus the car's median clean lap, with stint age and lap number controlled | weather share of lap time |
| `fuel_consumption` | **Skipped:** the dataset has no fuel measurements, so there is no ground truth | backend keeps its assumption-based estimate (flagged *Simulated*) |

Nothing is trained on generated data. A model without enough real samples is
written to the manifest as `insufficient_data` or `skipped`, with the reason.

Every feature is defined in [`road_sense_training/features.py`](road_sense_training/features.py)
and computed identically by the backend (`road-sense-service/strategy/ml_features.py`).
They are lap-level values the backend also has: stint age, recent lap-time trend, gaps,
position, race progress and weather.

### Evaluation

Metrics are cross-validated **by track** (each fold holds out whole circuits) and
compared with a naive baseline (the mean, or the majority class). The backend only
serves a model whose manifest says `beats_baseline: true`.

## Running on Kaggle

1. Create a notebook from [`notebooks/road_sense_training.ipynb`](notebooks/road_sense_training.ipynb).
2. Attach the race dataset. Files must be named `<track>_pit_data.csv`,
   `<track>_race_data.csv` and `<track>_weather_data.csv`, and can sit in any folder.
3. Turn **Internet** on.
4. Add the Kaggle **Secrets** `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (and optionally
   `SUPABASE_MODELS_BUCKET`, default `road-sense-models`).
5. Run all cells. The notebook clones this repository at `REPO_REF`, installs the
   pinned requirements, trains, and publishes the run.

Create the bucket once in Supabase (Storage → New bucket, **private**). The backend
reads it with the same service key.

## Artifact contract

```
<bucket>/models/runs/<run_id>/manifest.json
<bucket>/models/runs/<run_id>/<model>.joblib     # one sklearn Pipeline per model
<bucket>/models/latest/manifest.json             # uploaded last: points at the newest run
```

Each `.joblib` is a single `Pipeline` (median imputer → scaler → random forest)
fitted on a float array in `feature_columns` order. `manifest.json` records, per model:
`status`, `reason`, `task`, `target`, `file`, `sha256`, `feature_columns`,
`label_classes`, `metrics` (including `beats_baseline`), `n_samples`, `details`
(label distribution, weather reference conditions, ...) and `synthetic: false`.
It also records the library versions and per-track dataset summaries, including
how the weather was aligned to the laps.

A run is published only if at least one model trained, so a failed run never
replaces a working one.

## Pinned versions

The backend unpickles these models, so `scikit-learn`, `numpy` and `joblib` in
[`requirements.txt`](requirements.txt) must match `road-sense-service/requirements.txt`.
The backend also targets Python 3.11.

Training refuses to run with other versions unless you pass `--allow-version-mismatch`,
and the backend refuses to load a model whose recorded versions differ from its own.

## Running locally

```bash
pip install -r requirements.txt
python -m road_sense_training.train --data-dir ./data            # train only
python -m road_sense_training.train --data-dir ./data --upload   # and publish (needs .env values)
```

Options: `--models tire_degradation,pit_strategy` (subset), `--output-dir`, `-v`.

Exit codes:
- `0`: at least one model trained (and was published, if `--upload` was set).
- `1`: nothing trained.
- `2`: dataset or configuration error.
