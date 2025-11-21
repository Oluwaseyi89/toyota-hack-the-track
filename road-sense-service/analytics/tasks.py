from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import PerformanceAnalysis, CompetitorAnalysis, RaceSimulation
from telemetry.models import TelemetryData, Vehicle
from strategy.ml_integration import StrategyMLModels

@shared_task
def generate_performance_analytics():
    """Generate performance analytics for all vehicles"""
    try:
        ml_models = StrategyMLModels()
        generated_analytics = []
        
        vehicles = Vehicle.objects.all()
        for vehicle in vehicles:
            # Get recent telemetry for this vehicle
            recent_telemetry = TelemetryData.objects.filter(
                vehicle=vehicle
            ).order_by('-timestamp')[:10]
            
            if not recent_telemetry:
                continue
            
            latest_telemetry = recent_telemetry[0]
            
            # Generate performance analysis
            analysis_data = _generate_vehicle_analysis(vehicle, recent_telemetry, ml_models)
            
            analysis = PerformanceAnalysis.objects.create(
                vehicle=vehicle,
                lap_number=latest_telemetry.lap_number,
                sector_times=analysis_data['sector_times'],
                tire_degradation_impact=analysis_data['tire_impact'],
                fuel_impact=analysis_data['fuel_impact'],
                weather_impact=analysis_data['weather_impact'],
                predicted_lap_time=analysis_data['predicted_time']
            )
            
            generated_analytics.append(f"Analysis for {vehicle}")
        
        return f"Generated analytics for {len(generated_analytics)} vehicles"
        
    except Exception as e:
        return f"Error generating performance analytics: {str(e)}"

@shared_task
def update_competitor_analysis():
    """Update competitor analysis based on current race data"""
    try:
        # Get all vehicles and their latest telemetry
        vehicles = Vehicle.objects.all()
        competitor_data = []
        
        for vehicle in vehicles:
            latest_telemetry = TelemetryData.objects.filter(
                vehicle=vehicle
            ).order_by('-timestamp').first()
            
            if latest_telemetry:
                threat_level = _calculate_threat_level(latest_telemetry)
                
                analysis = CompetitorAnalysis.objects.create(
                    vehicle=vehicle,
                    lap_number=latest_telemetry.lap_number,
                    competitor_data={
                        'position': latest_telemetry.position,
                        'gap_to_leader': latest_telemetry.gap_to_leader,
                        'recent_lap_trend': 'improving',  # Would calculate from history
                        'tire_age': latest_telemetry.lap_number % 30,  # Simulated
                        'last_pit_lap': max(0, latest_telemetry.lap_number - 15)
                    },
                    threat_level=threat_level
                )
                
                competitor_data.append(f"Competitor analysis for {vehicle}")
        
        return f"Updated {len(competitor_data)} competitor analyses"
        
    except Exception as e:
        return f"Error updating competitor analysis: {str(e)}"

@shared_task
def run_batch_simulations(simulation_count=5):
    """Run multiple race simulations for strategy optimization"""
    try:
        simulations_ran = []
        
        for i in range(simulation_count):
            parameters = {
                'simulation_id': f'batch_{timezone.now().strftime("%Y%m%d_%H%M%S")}_{i}',
                'strategy_variants': ['EARLY', 'MIDDLE', 'LATE', 'UNDERCUT'],
                'weather_conditions': ['dry', 'mixed', 'wet'],
                'duration_laps': 40
            }
            
            # Run simulation (would use your ML models)
            results = _run_single_simulation(parameters)
            
            simulation = RaceSimulation.objects.create(
                simulation_id=parameters['simulation_id'],
                parameters=parameters,
                results=results,
                is_completed=True
            )
            
            simulations_ran.append(simulation.simulation_id)
        
        return f"Ran {len(simulations_ran)} batch simulations"
        
    except Exception as e:
        return f"Error running batch simulations: {str(e)}"

def _generate_vehicle_analysis(vehicle, telemetry_data, ml_models):
    """Generate performance analysis for a single vehicle"""
    latest_telemetry = telemetry_data[0]
    
    # Calculate average sector times
    sector_times = []
    if len(telemetry_data) >= 3:
        for i in range(3):
            sector_time = sum(
                getattr(tel, f'sector{i+1}_time').total_seconds() 
                for tel in telemetry_data[:3] 
                if getattr(tel, f'sector{i+1}_time')
            ) / 3
            sector_times.append(sector_time)
    else:
        sector_times = [28.5, 29.0, 27.5]  # Default values
    
    # Use ML models for predictions
    tire_impact = 0.1  # Would come from tire model
    fuel_impact = 0.05  # Would come from fuel model
    weather_impact = 0.08  # Would come from weather model
    
    predicted_time = sum(sector_times) + tire_impact + fuel_impact + weather_impact
    
    return {
        'sector_times': sector_times,
        'tire_impact': tire_impact,
        'fuel_impact': fuel_impact,
        'weather_impact': weather_impact,
        'predicted_time': predicted_time
    }

def _calculate_threat_level(telemetry):
    """Calculate threat level for a competitor"""
    if telemetry.position <= 3 and telemetry.gap_to_leader < 3.0:
        return 'HIGH'
    elif telemetry.position <= 8 and telemetry.gap_to_leader < 10.0:
        return 'MEDIUM'
    else:
        return 'LOW'

def _run_single_simulation(parameters):
    """Run a single race simulation"""
    # This would integrate with your comprehensive ML models
    return {
        'optimal_strategy': parameters['strategy_variants'][0],
        'predicted_finish_position': 2,
        'total_race_time': 45 * 60 + 15.32,
        'key_factors': {
            'tire_performance': 'good',
            'fuel_efficiency': 'average',
            'weather_adaptation': 'excellent'
        },
        'confidence_score': 0.82
    }