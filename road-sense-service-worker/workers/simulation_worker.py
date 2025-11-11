from main import app
from utils.simulation_engine import RaceSimulator

@app.task(bind=True, time_limit=300)
def run_strategy_simulation(self, race_state: dict, scenario_type: str):
    """Run heavy simulation tasks in background"""
    try:
        simulator = RaceSimulator()
        
        if scenario_type == "pit_stop":
            scenarios = simulator.simulate_pit_strategies(race_state)
        elif scenario_type == "caution":
            scenarios = simulator.simulate_caution_responses(race_state)
        elif scenario_type == "tire_strategy":
            scenarios = simulator.simulate_tire_strategies(race_state)
        else:
            scenarios = simulator.simulate_comprehensive(race_state)
        
        # Rank scenarios by expected gain
        ranked_scenarios = simulator.rank_scenarios(scenarios)
        
        return {
            'scenarios': ranked_scenarios,
            'recommendation': ranked_scenarios[0] if ranked_scenarios else None,
            'simulation_id': self.request.id
        }
        
    except Exception as exc:
        return {'error': str(exc), 'status': 'failed'}

@app.task
def simulate_race_outcome(self, initial_conditions: dict, strategy: dict):
    """Simulate entire race outcome with given strategy"""
    try:
        simulator = RaceSimulator()
        outcome = simulator.simulate_race(initial_conditions, strategy)
        return {
            'final_position': outcome.get('position'),
            'total_time': outcome.get('total_time'),
            'pit_stops': outcome.get('pit_stops', []),
            'strategy_score': outcome.get('strategy_score', 0)
        }
    except Exception as exc:
        return {'error': str(exc), 'status': 'failed'}