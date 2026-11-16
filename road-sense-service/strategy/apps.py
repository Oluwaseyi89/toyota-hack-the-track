from django.apps import AppConfig


class StrategyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'strategy'

    def ready(self):
        # ML models are NOT loaded here: ready() also runs for migrate,
        # collectstatic and every management command. strategy.model_registry
        # loads them lazily, once per process, on first prediction.
        from . import signals  # noqa: F401
        print("Strategy signals connected")
