"""
Road Sense model training.

Trains the strategy models served by road-sense-service from the Toyota GR Cup
race timing data (run on Kaggle), and publishes them to Supabase Storage as
sklearn Pipelines plus a manifest.json describing the artifact contract.

Entry point: python -m road_sense_training.train --help
"""

__version__ = "1.0.0"
