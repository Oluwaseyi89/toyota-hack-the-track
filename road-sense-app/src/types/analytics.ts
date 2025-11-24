export interface PerformanceAnalysis {
    id: string;
    vehicle: any;
    lap_number: number;
    sector_times: number[]; // [sector1, sector2, sector3] in seconds
    tire_degradation_impact: number;
    fuel_impact: number;
    weather_impact: number;
    predicted_lap_time: number;
    actual_lap_time: number | null;
    analysis_timestamp: string;
  }
  
  export interface RaceSimulation {
    id: string;
    simulation_id: string;
    parameters: {
      [key: string]: any;
    };
    results: {
      optimal_pit_lap?: number;
      predicted_finish_position?: number;
      expected_total_time?: number;
      tire_degradation_impact?: number;
      fuel_impact?: number;
      weather_impact?: number;
      confidence?: number;
      [key: string]: any;
    };
    created_at: string;
    is_completed: boolean;
  }
  
  export interface CompetitorAnalysis {
    id: string;
    vehicle: any;
    lap_number: number;
    competitor_data: {
      positions?: { [vehicleId: string]: number };
      gaps?: { [vehicleId: string]: number };
      lap_times?: { [vehicleId: string]: number };
      [key: string]: any;
    };
    threat_level: 'LOW' | 'MEDIUM' | 'HIGH';
    analysis_timestamp: string;
  }
  
  export interface AnalyticsSummary {
    performance_analysis: PerformanceAnalysis[];
    competitor_analysis: CompetitorAnalysis[];
    simulation_results: RaceSimulation[];
    timestamp: string;
  }
  
  export interface AnalyticsState {
    // Data collections
    performanceAnalyses: PerformanceAnalysis[];
    raceSimulations: RaceSimulation[];
    competitorAnalyses: CompetitorAnalysis[];
    
    // Current analytics
    currentPerformance: PerformanceAnalysis | null;
    currentCompetitorAnalysis: CompetitorAnalysis | null;
    analyticsSummary: AnalyticsSummary | null;
    
    // UI state
    isLoading: boolean;
    error: string | null;
    
    // Simulation state
    isSimulating: boolean;
    simulationProgress: number;
    
    // Filters and preferences
    selectedTimeRange: 'realtime' | 'session' | 'all';
    analysisDepth: 'BASIC' | 'DETAILED' | 'ADVANCED';
  }
  
  export interface AnalyticsActions {
    // State setters
    setPerformanceAnalyses: (analyses: PerformanceAnalysis[]) => void;
    setRaceSimulations: (simulations: RaceSimulation[]) => void;
    setCompetitorAnalyses: (analyses: CompetitorAnalysis[]) => void;
    setCurrentPerformance: (analysis: PerformanceAnalysis | null) => void;
    setCurrentCompetitorAnalysis: (analysis: CompetitorAnalysis | null) => void;
    setAnalyticsSummary: (summary: AnalyticsSummary | null) => void;
    setSelectedTimeRange: (range: 'realtime' | 'session' | 'all') => void;
    setAnalysisDepth: (depth: 'BASIC' | 'DETAILED' | 'ADVANCED') => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
    setSimulating: (simulating: boolean) => void;
    setSimulationProgress: (progress: number) => void;
    
    // API actions
    fetchCurrentPerformance: () => Promise<{ success: boolean; analysis?: PerformanceAnalysis }>;
    fetchAnalyticsSummary: () => Promise<{ success: boolean; summary?: AnalyticsSummary }>;
    runRaceSimulation: (parameters?: any) => Promise<{ success: boolean; simulation?: RaceSimulation }>;
    fetchRecentSimulations: () => Promise<{ success: boolean; simulations?: RaceSimulation[] }>;
    fetchPerformanceHistory: (vehicleId?: string) => Promise<{ success: boolean; analyses?: PerformanceAnalysis[] }>;
    
    // Utility actions
    getPerformanceTrend: () => { trend: 'IMPROVING' | 'STABLE' | 'DECLINING'; change: number };
    getCompetitorThreats: () => CompetitorAnalysis[];
    getOptimalStrategy: () => { pitLap: number; expectedGain: number; confidence: number } | null;
    clearAnalytics: () => void;
  }
  
  export type AnalyticsStore = AnalyticsState & AnalyticsActions;