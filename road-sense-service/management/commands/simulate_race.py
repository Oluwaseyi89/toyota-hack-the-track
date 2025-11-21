from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import asyncio
from utils.data_processors import TelemetryProcessor, WeatherProcessor
from telemetry.models import TelemetryData, WeatherData
from strategy.ml_integration import StrategyMLModels
from alerts.models import Alert

class Command(BaseCommand):
    help = 'Simulate a complete race with real-time data generation'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--duration',
            type=int,
            default=300,
            help='Simulation duration in seconds'
        )
        parser.add_argument(
            '--interval',
            type=float,
            default=1.0,
            help='Data generation interval in seconds'
        )
    
    def handle(self, *args, **options):
        self.stdout.write('Starting race simulation...')
        
        duration = options['duration']
        interval = options['interval']
        
        # Initialize processors
        telemetry_processor = TelemetryProcessor()
        weather_processor = WeatherProcessor()
        ml_models = StrategyMLModels()
        
        start_time = timezone.now()
        end_time = start_time + timedelta(seconds=duration)
        
        current_time = start_time
        lap_counter = 1
        
        try:
            while current_time < end_time:
                # Generate telemetry data for current "lap"
                telemetry_data = telemetry_processor.generate_simulated_telemetry()
                
                # Update lap numbers to simulate progress
                for data in telemetry_data:
                    if isinstance(data, TelemetryData):
                        data.lap_number = lap_counter
                        data.timestamp = current_time
                        data.save()
                
                # Generate weather data every 5 "laps"
                if lap_counter % 5 == 0:
                    weather_data = weather_processor.generate_simulated_weather()
                    weather_data.timestamp = current_time
                    weather_data.save()
                
                # Generate alerts based on conditions
                if lap_counter % 10 == 0:
                    self._generate_simulation_alerts(lap_counter, ml_models)
                
                self.stdout.write(f'Simulated lap {lap_counter} at {current_time}')
                
                # Wait for next interval
                import time
                time.sleep(interval)
                
                current_time = timezone.now()
                lap_counter += 1
        
        except KeyboardInterrupt:
            self.stdout.write('Simulation interrupted by user')
        
        self.stdout.write(
            self.style.SUCCESS(f'Simulation completed after {lap_counter} laps')
        )
    
    def _generate_simulation_alerts(self, lap_number, ml_models):
        """Generate simulation alerts based on lap conditions"""
        if lap_number == 10:
            Alert.objects.create(
                alert_type='TIRE_WEAR',
                severity='MEDIUM',
                title='Tire Wear Approaching Threshold',
                message='Front tires showing increased degradation',
                recommended_action='Monitor tire performance for next 5 laps',
                triggered_by={'simulation_lap': lap_number}
            )
        
        elif lap_number == 20:
            Alert.objects.create(
                alert_type='STRATEGY_OPPORTUNITY',
                severity='HIGH',
                title='Optimal Pit Window Open',
                message='Current conditions favor pit stop strategy',
                recommended_action='Consider pit stop between laps 22-25',
                triggered_by={'simulation_lap': lap_number}
            )