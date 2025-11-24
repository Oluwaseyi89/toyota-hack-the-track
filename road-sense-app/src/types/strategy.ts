export interface PitStrategy {
  id: string;
  vehicle: any; // Can be Vehicle type if you want to import it
  recommended_lap: number;
  confidence: number;
  strategy_type: 'EARLY' | 'MIDDLE' | 'LATE' | 'UNDERCUT' | 'OVERCUT';
  reasoning: string;
  created_at: string;
  is_active: boolean;
}

export interface TireStrategy {
  id: string;
  vehicle: any;
  predicted_laps_remaining: number;
  degradation_rate: number;
  optimal_change_lap: number;
  confidence: number;
  created_at: string;
}

export interface FuelStrategy {
  id: string;
  vehicle: any;
  current_fuel: number;
  predicted_laps_remaining: number;
  consumption_rate: number;
  need_to_conserve: boolean;
  created_at: string;
}

export interface StrategyPrediction {
  pit_strategy: PitStrategy;
  tire_strategy: TireStrategy;
  fuel_strategy: FuelStrategy;
  timestamp: string;
}

export interface StrategyState {
  // Current strategies
  pitStrategies: PitStrategy[];
  tireStrategies: TireStrategy[];
  fuelStrategies: FuelStrategy[];
  
  // Comprehensive prediction
  currentPrediction: StrategyPrediction | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Selected strategy for detailed view
  selectedPitStrategy: PitStrategy | null;
  selectedTireStrategy: TireStrategy | null;
  
  // Strategy preferences
  preferredStrategyType: PitStrategy['strategy_type'] | null;
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface StrategyActions {
  // State setters
  setPitStrategies: (strategies: PitStrategy[]) => void;
  setTireStrategies: (strategies: TireStrategy[]) => void;
  setFuelStrategies: (strategies: FuelStrategy[]) => void;
  setCurrentPrediction: (prediction: StrategyPrediction | null) => void;
  setSelectedPitStrategy: (strategy: PitStrategy | null) => void;
  setSelectedTireStrategy: (strategy: TireStrategy | null) => void;
  setPreferredStrategyType: (type: PitStrategy['strategy_type'] | null) => void;
  setRiskTolerance: (tolerance: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // API actions
  fetchCurrentPitStrategy: () => Promise<{ success: boolean; strategy?: PitStrategy }>;
  fetchCurrentTireStrategy: () => Promise<{ success: boolean; strategy?: TireStrategy }>;
  fetchComprehensivePrediction: () => Promise<{ success: boolean; prediction?: StrategyPrediction }>;
  createPitStrategy: (data: Partial<PitStrategy>) => Promise<{ success: boolean; strategy?: PitStrategy }>;
  createTireStrategy: (data: Partial<TireStrategy>) => Promise<{ success: boolean; strategy?: TireStrategy }>;
  updatePitStrategy: (id: string, data: Partial<PitStrategy>) => Promise<{ success: boolean; strategy?: PitStrategy }>;
  deactivatePitStrategy: (id: string) => Promise<{ success: boolean }>;
  
  // Utility actions
  getOptimalPitWindow: () => { startLap: number; endLap: number; confidence: number } | null;
  getTireHealth: () => { status: 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL'; lapsRemaining: number };
  clearStrategies: () => void;
}

export type StrategyStore = StrategyState & StrategyActions;

