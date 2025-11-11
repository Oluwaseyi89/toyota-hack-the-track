from .celery import app



@app.task
def evaluate_caution_response(caution_data: dict):
    """Evaluate response to caution flag"""
    
    # Immediate strategy analysis
    immediate_analysis = process_telemetry_batch.delay(
        caution_data['pre_caution_telemetry']
    ).get()
    
    # Run multiple scenarios
    scenarios = run_strategy_simulation.delay(
        immediate_analysis, 'caution'
    ).get()
    
    # Calculate risk for each scenario
    risk_assessed_scenarios = []
    for scenario in scenarios['scenarios']:
        risk_score = calculate_risk_score(scenario, caution_data)
        risk_assessed_scenarios.append({
            **scenario,
            'risk_score': risk_score,
            'recommended': risk_score < 0.3  # Low risk threshold
        })
    
    return {
        'scenarios': risk_assessed_scenarios,
        'immediate_recommendation': next(
            (s for s in risk_assessed_scenarios if s['recommended']), 
            None
        ),
        'analysis_timestamp': pd.Timestamp.now().isoformat()
    }