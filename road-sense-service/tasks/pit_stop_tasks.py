from .celery import app


@app.task
def analyze_pit_stop_strategy(race_data: dict):
    """Complete pit stop analysis pipeline"""
    
    # Step 1: Process current telemetry
    processed_data = process_telemetry_batch.delay(race_data).get()
    
    # Step 2: Predict future tire wear
    tire_predictions = predict_tire_degradation.delay(
        processed_data, laps_ahead=15
    ).get()
    
    # Step 3: Run strategy simulations
    simulation_results = run_strategy_simulation.delay(
        {**processed_data, 'tire_predictions': tire_predictions},
        'pit_stop'
    ).get()
    
    # Step 4: Generate alerts
    alerts = generate_strategy_alerts.delay(processed_data).get()
    
    return {
        'optimal_window': simulation_results['recommendation'],
        'tire_predictions': tire_predictions,
        'alerts': alerts,
        'confidence': calculate_confidence(processed_data, simulation_results)
    }