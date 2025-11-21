from django.core.management.base import BaseCommand
from utils.data_processors import TelemetryProcessor, WeatherProcessor
from telemetry.models import WeatherData

class Command(BaseCommand):
    help = 'Ingest telemetry data from external sources or generate simulated data'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--source',
            type=str,
            choices=['simulate', 'external'],
            default='simulate',
            help='Data source: simulate or external'
        )
        parser.add_argument(
            '--count',
            type=int,
            default=20,
            help='Number of telemetry records to generate'
        )
    
    def handle(self, *args, **options):
        source = options['source']
        count = options['count']
        
        processor = TelemetryProcessor()
        weather_processor = WeatherProcessor()
        
        if source == 'simulate':
            self.stdout.write(f'Generating {count} simulated telemetry records...')
            
            for i in range(count):
                # Generate telemetry
                telemetry_data = processor.generate_simulated_telemetry()
                
                # Save telemetry
                for data in telemetry_data:
                    data.save()
                
                # Generate weather data occasionally
                if i % 5 == 0:
                    weather_data = weather_processor.generate_simulated_weather()
                    weather_data.save()
                
                self.stdout.write(f'Generated batch {i + 1}/{count}')
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully generated {count} telemetry batches')
            )
        
        elif source == 'external':
            self.stdout.write('Processing external telemetry data...')
            # This would connect to external APIs
            # For now, we'll simulate external data
            external_data = {
                'vehicle_id': 'GR86-086-000',
                'car_number': 86,
                'team': 'Toyota GR Team',
                'driver': 'Demo Driver',
                'lap_number': 12,
                'lap_time': 85.234,
                'speed': 185.6,
                'rpm': 12500,
                'gear': 5,
                'throttle': 95.0,
                'brake': 10.0,
                'position': 3,
                'gap_to_leader': 2.5
            }
            
            result = processor.process_external_telemetry(external_data)
            if result:
                self.stdout.write(
                    self.style.SUCCESS('Successfully processed external telemetry')
                )
            else:
                self.stdout.write(
                    self.style.ERROR('Failed to process external telemetry')
                )