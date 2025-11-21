from django.apps import AppConfig


class StrategyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'strategy'

    def ready(self):
        # Load ML models at startup
        from .ml_integration import StrategyMLModels
        self.ml_models = StrategyMLModels()
        
        # Import and connect signals
        try:
            from . import signals
            print("Strategy signals connected")
        except ImportError:
            pass  # Signals might not be implemented yet
