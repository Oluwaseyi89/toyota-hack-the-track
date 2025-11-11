from main import app 


@app.task
def generate_strategy_alerts(race_state: dict):
    """Generate real-time strategy alerts"""
    alerts = []
    
    # Tire wear alerts
    if race_state['tire_wear'] > 80:
        alerts.append({
            'type': 'CRITICAL',
            'message': 'High tire wear - Consider pit stop soon',
            'priority': 'high',
            'recommended_action': 'pit_within_3_laps'
        })
    
    # Fuel strategy alerts
    fuel_laps_remaining = race_state['fuel_remaining'] / race_state['avg_fuel_consumption']
    if fuel_laps_remaining < 5:
        alerts.append({
            'type': 'WARNING', 
            'message': f'Low fuel - {fuel_laps_remaining:.1f} laps remaining',
            'priority': 'medium',
            'recommended_action': 'conserve_fuel'
        })
    
    # Pace degradation alerts
    if race_state['pace_degradation'] > 0.5:
        alerts.append({
            'type': 'INFO',
            'message': 'Pace degradation detected - check tire strategy',
            'priority': 'low',
            'recommended_action': 'analyze_tire_performance'
        })
    
    return alerts