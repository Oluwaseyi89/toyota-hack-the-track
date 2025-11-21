from celery import shared_task
from django.utils import timezone
from .models import PitStrategy, TireStrategy, FuelStrategy
from .ml_integration import StrategyMLModels
from telemetry.models import TelemetryData, Vehicle

@shared_task
def update_strategy_predictions():
    """Update strategy predictions using ML models"""
    try:
        ml_models = StrategyMLModels()
        updated_strategies = []
        
        # Get latest telemetry for all vehicles
        vehicles = Vehicle.objects.all()
        
        for vehicle in vehicles:
            latest_telemetry = TelemetryData.objects.filter(
                vehicle=vehicle
            ).order_by('-timestamp').first()
            
            if not latest_telemetry:
                continue
            
            # Generate pit strategy prediction
            race_data = _prepare_race_data(latest_telemetry)
            strategy_type, confidence = ml_models.predict_pit_strategy(race_data)
            
            # Update or create pit strategy
            pit_strategy, created = PitStrategy.objects.update_or_create(
                vehicle=vehicle,
                is_active=True,
                defaults={
                    'recommended_lap': race_data['current_lap'] + _calculate_pit_offset(strategy_type),
                    'confidence': confidence[0].max() if hasattr(confidence, '__len__') else confidence,
                    'strategy_type': strategy_type,
                    'reasoning': f"ML prediction based on lap {race_data['current_lap']} conditions"
                }
            )
            updated_strategies.append(f"Pit strategy for {vehicle}")
            
            # Generate tire strategy
            tire_prediction = ml_models.predict_tire_degradation(latest_telemetry)
            tire_strategy = TireStrategy.objects.create(
                vehicle=vehicle,
                predicted_laps_remaining=tire_prediction.get('predicted_laps_remaining', 15),
                degradation_rate=tire_prediction.get('grip_loss_rate', 0.1),
                optimal_change_lap=latest_telemetry.lap_number + tire_prediction.get('predicted_laps_remaining', 15),
                confidence=0.8
            )
            updated_strategies.append(f"Tire strategy for {vehicle}")
        
        return f"Updated strategies: {', '.join(updated_strategies)}"
        
    except Exception as e:
        return f"Error updating strategy predictions: {str(e)}"

@shared_task
def simulate_race_strategy(parameters):
    """Run comprehensive race strategy simulation"""
    try:
        ml_models = StrategyMLModels()
        
        # This would run your comprehensive race simulation
        simulation_results = {
            'optimal_pit_windows': [],
            'tire_performance': {},
            'fuel_usage': {},
            'weather_impact': {},
            'total_race_time': 0,
            'confidence': 0.85
        }
        
        # Simulate for each vehicle
        vehicles = Vehicle.objects.all()
        for vehicle in vehicles:
            # Run simulation using your ML models
            simulation_results['optimal_pit_windows'].append({
                'vehicle': vehicle.number,
                'optimal_lap': 22 + vehicle.number % 10,
                'confidence': 0.8 + (vehicle.number % 10) * 0.02
            })
        
        return simulation_results
        
    except Exception as e:
        return f"Error in race simulation: {str(e)}"

def _prepare_race_data(telemetry):
    """Prepare race data for ML model prediction"""
    return {
        'current_lap': telemetry.lap_number,
        'position': telemetry.position,
        'gap_to_leader': telemetry.gap_to_leader,
        'tire_degradation': 0.1,  # Would come from tire model
        'fuel_remaining': 50.0,   # Would come from fuel calculations
        'track_position': 'midfield' if 5 <= telemetry.position <= 15 else 'front' if telemetry.position <= 4 else 'back',
        'lap_time_trend': 'stable'  # Would calculate from recent laps
    }

def _calculate_pit_offset(strategy_type):
    """Calculate pit lap offset based on strategy type"""
    offsets = {
        'EARLY': 5,
        'MIDDLE': 10,
        'LATE': 15,
        'UNDERCUT': 3,
        'OVERCUT': 12
    }
    return offsets.get(strategy_type, 10)