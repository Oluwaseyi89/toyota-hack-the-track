import random
from datetime import timedelta
from django.utils import timezone
from telemetry.models import TelemetryData, Vehicle, TireTelemetry, WeatherData

class TelemetryProcessor:
    def __init__(self):
        self.vehicles = self._initialize_vehicles()
    
    def _initialize_vehicles(self):
        """Initialize or get demo vehicles"""
        vehicles = []
        for i in range(1, 21):  # 20 demo vehicles
            vehicle, created = Vehicle.objects.get_or_create(
                number=i,
                defaults={
                    'team': f'Team {i}',
                    'driver': f'Driver {i}',
                    'vehicle_id': f'GR86-{i:03d}-000'
                }
            )
            vehicles.append(vehicle)
        return vehicles
    
    def generate_simulated_telemetry(self):
        """Generate simulated telemetry data for testing"""
        simulated_data = []
        
        for vehicle in self.vehicles:
            # Base lap time with some variation
            base_lap_time = 85.0 + random.uniform(-2.0, 2.0)  # 83-87 seconds
            
            telemetry = TelemetryData(
                vehicle=vehicle,
                lap_number=random.randint(1, 30),
                lap_time=timedelta(seconds=base_lap_time),
                sector1_time=timedelta(seconds=base_lap_time * 0.35),
                sector2_time=timedelta(seconds=base_lap_time * 0.33),
                sector3_time=timedelta(seconds=base_lap_time * 0.32),
                speed=random.uniform(120, 200),
                rpm=random.randint(8000, 13000),
                gear=random.randint(2, 6),
                throttle=random.uniform(50, 100),
                brake=random.uniform(0, 50),
                position=vehicle.number,
                gap_to_leader=random.uniform(0, 30),
                timestamp=timezone.now()
            )
            
            simulated_data.append(telemetry)
            
            # Create tire telemetry
            tire_telemetry = TireTelemetry(
                telemetry=telemetry,
                front_left_temp=random.uniform(80, 120),
                front_right_temp=random.uniform(80, 120),
                rear_left_temp=random.uniform(75, 110),
                rear_right_temp=random.uniform(75, 110),
                front_left_pressure=random.uniform(25, 28),
                front_right_pressure=random.uniform(25, 28),
                rear_left_pressure=random.uniform(23, 26),
                rear_right_pressure=random.uniform(23, 26)
            )
            
            simulated_data.append(tire_telemetry)
        
        return simulated_data
    
    def get_latest_telemetry(self):
        """Get latest telemetry data for WebSocket"""
        recent_time = timezone.now() - timedelta(seconds=5)
        recent_telemetry = TelemetryData.objects.filter(
            timestamp__gte=recent_time
        ).select_related('vehicle', 'tiretelemetry')[:20]  # Limit to 20 vehicles
        
        telemetry_data = []
        for telemetry in recent_telemetry:
            telemetry_data.append({
                'vehicle_id': telemetry.vehicle.vehicle_id,
                'lap_number': telemetry.lap_number,
                'lap_time': telemetry.lap_time.total_seconds(),
                'speed': telemetry.speed,
                'position': telemetry.position,
                'gap_to_leader': telemetry.gap_to_leader,
                'timestamp': telemetry.timestamp.isoformat()
            })
        
        return telemetry_data
    
    def process_external_telemetry(self, external_data):
        """Process telemetry data from external sources"""
        try:
            # This would handle data from official racing APIs
            vehicle, created = Vehicle.objects.get_or_create(
                vehicle_id=external_data['vehicle_id'],
                defaults={
                    'number': external_data.get('car_number', 0),
                    'team': external_data.get('team', 'Unknown'),
                    'driver': external_data.get('driver', 'Unknown')
                }
            )
            
            telemetry = TelemetryData(
                vehicle=vehicle,
                lap_number=external_data['lap_number'],
                lap_time=timedelta(seconds=external_data['lap_time']),
                speed=external_data['speed'],
                rpm=external_data.get('rpm', 0),
                gear=external_data.get('gear', 0),
                throttle=external_data.get('throttle', 0),
                brake=external_data.get('brake', 0),
                position=external_data['position'],
                gap_to_leader=external_data['gap_to_leader'],
                timestamp=timezone.now()
            )
            
            telemetry.save()
            return telemetry
            
        except Exception as e:
            print(f"Error processing external telemetry: {e}")
            return None

class WeatherProcessor:
    def generate_simulated_weather(self):
        """Generate simulated weather data"""
        return WeatherData(
            track_temperature=random.uniform(20, 45),
            air_temperature=random.uniform(15, 35),
            humidity=random.uniform(30, 80),
            pressure=random.uniform(1000, 1020),
            wind_speed=random.uniform(0, 15),
            wind_direction=random.uniform(0, 360),
            rainfall=random.uniform(0, 5),
            timestamp=timezone.now()
        )