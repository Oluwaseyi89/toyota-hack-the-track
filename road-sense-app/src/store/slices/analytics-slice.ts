import { StateCreator } from 'zustand';
import { AnalyticsStore, PerformanceAnalysis, RaceSimulation, AnalyticsState, CompetitorAnalysis, AnalyticsSummary } from '@/types/analytics';
import { getCookie } from '@/lib/get-cookie';


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL! || 'http://localhost:8000';



export const initialAnalyticsState: AnalyticsState = {
  performanceAnalyses: [],
  raceSimulations: [],
  competitorAnalyses: [],
  currentPerformance: null,
  currentCompetitorAnalysis: null,
  analyticsSummary: null,
  isLoading: false,
  error: null,
  isSimulating: false,
  simulationProgress: 0,
  selectedTimeRange: 'realtime',
  analysisDepth: 'DETAILED',
};

export const createAnalyticsSlice: StateCreator<AnalyticsStore> = (set, get) => ({
  ...initialAnalyticsState,

  // ✅ Simple state setters
  setPerformanceAnalyses: (analyses: PerformanceAnalysis[]) => {
    set({ performanceAnalyses: analyses });
  },

  setRaceSimulations: (simulations: RaceSimulation[]) => {
    set({ raceSimulations: simulations });
  },

  setCompetitorAnalyses: (analyses: CompetitorAnalysis[]) => {
    set({ competitorAnalyses: analyses });
  },

  setCurrentPerformance: (analysis: PerformanceAnalysis | null) => {
    set({ currentPerformance: analysis });
  },

  setCurrentCompetitorAnalysis: (analysis: CompetitorAnalysis | null) => {
    set({ currentCompetitorAnalysis: analysis });
  },

  setAnalyticsSummary: (summary: AnalyticsSummary | null) => {
    set({ analyticsSummary: summary });
  },

  setSelectedTimeRange: (range: 'realtime' | 'session' | 'all') => {
    set({ selectedTimeRange: range });
  },

  setAnalysisDepth: (depth: 'BASIC' | 'DETAILED' | 'ADVANCED') => {
    set({ analysisDepth: depth });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  setSimulating: (simulating: boolean) => {
    set({ isSimulating: simulating });
  },

  setSimulationProgress: (progress: number) => {
    set({ simulationProgress: progress });
  },

  // ------------------------
  // 🔹 API Actions
  // ------------------------

  fetchCurrentPerformance: async () => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/analytics/performance/current/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch current performance analysis: ${response.statusText}`);
      }

      const result = await response.json();
      const analysis = result.data || result;

      // Update performance analyses list
      const existingAnalyses = get().performanceAnalyses.filter(a => a.id !== analysis.id);
      set({ 
        performanceAnalyses: [analysis, ...existingAnalyses],
        currentPerformance: analysis,
        isLoading: false 
      });

      return { success: true, analysis };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch current performance analysis';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  fetchAnalyticsSummary: async () => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/analytics/summary/dashboard/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics summary: ${response.statusText}`);
      }

      const result = await response.json();
      const summary = result.data || result;

      // Update individual data collections from summary
      set({ 
        analyticsSummary: summary,
        performanceAnalyses: summary.performance_analysis || [],
        competitorAnalyses: summary.competitor_analysis || [],
        raceSimulations: summary.simulation_results || [],
        isLoading: false 
      });

      return { success: true, summary };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch analytics summary';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  runRaceSimulation: async (parameters = {}) => {
    set({ isSimulating: true, simulationProgress: 0, error: null });

    try {
      const csrfToken = await getCookie();
      
      // Simulate progress updates (you can replace this with actual progress from your backend)
      const progressInterval = setInterval(() => {
        const currentProgress = get().simulationProgress;
        if (currentProgress < 90) {
          get().setSimulationProgress(currentProgress + 10);
        }
      }, 500);

      const response = await fetch(`${API_BASE_URL}/api/analytics/simulations/simulate/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
        body: JSON.stringify({ parameters }),
      });

      clearInterval(progressInterval);
      set({ simulationProgress: 100 });

      if (!response.ok) {
        throw new Error(`Failed to run race simulation: ${response.statusText}`);
      }

      const result = await response.json();
      const simulation = result.data || result;

      // Add to simulations list
      set({ 
        raceSimulations: [simulation, ...get().raceSimulations],
        isSimulating: false,
        simulationProgress: 0
      });

      return { success: true, simulation };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run race simulation';
      set({ error: message, isSimulating: false, simulationProgress: 0 });
      return { success: false };
    }
  },

  fetchRecentSimulations: async () => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/analytics/simulations/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recent simulations: ${response.statusText}`);
      }

      const result = await response.json();
      const simulations = Array.isArray(result) ? result : result.results || result.data || [];

      set({ 
        raceSimulations: simulations,
        isLoading: false 
      });

      return { success: true, simulations };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch recent simulations';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  fetchPerformanceHistory: async (vehicleId?: string) => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      let url = `${API_BASE_URL}/api/analytics/performance/`;
      if (vehicleId) {
        url += `?vehicle_id=${vehicleId}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch performance history: ${response.statusText}`);
      }

      const result = await response.json();
      const analyses = Array.isArray(result) ? result : result.results || result.data || [];

      set({ 
        performanceAnalyses: analyses,
        isLoading: false 
      });

      return { success: true, analyses };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch performance history';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  // ------------------------
  // 🔹 Utility Actions
  // ------------------------

  getPerformanceTrend: () => {
    const { performanceAnalyses } = get();
    
    if (performanceAnalyses.length < 2) {
      return { trend: 'STABLE' as const, change: 0 };
    }

    // Get the most recent analyses (last 5)
    const recentAnalyses = performanceAnalyses
      .slice(0, 5)
      .filter(analysis => analysis.actual_lap_time !== null)
      .sort((a, b) => new Date(b.analysis_timestamp).getTime() - new Date(a.analysis_timestamp).getTime());

    if (recentAnalyses.length < 2) {
      return { trend: 'STABLE' as const, change: 0 };
    }

    // Calculate average lap time change
    const currentAvg = recentAnalyses[0].actual_lap_time!;
    const previousAvg = recentAnalyses[recentAnalyses.length - 1].actual_lap_time!;
    const change = ((currentAvg - previousAvg) / previousAvg) * 100;

    let trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    if (change < -1) {
      trend = 'IMPROVING'; // Getting faster (negative change)
    } else if (change > 1) {
      trend = 'DECLINING'; // Getting slower (positive change)
    } else {
      trend = 'STABLE';
    }

    return { trend, change: Math.abs(change) };
  },

  getCompetitorThreats: () => {
    const { competitorAnalyses } = get();
    
    return competitorAnalyses
      .filter(analysis => analysis.threat_level === 'HIGH')
      .sort((a, b) => new Date(b.analysis_timestamp).getTime() - new Date(a.analysis_timestamp).getTime());
  },

  getOptimalStrategy: () => {
    const { raceSimulations, performanceAnalyses } = get();
    
    if (raceSimulations.length === 0 || performanceAnalyses.length === 0) {
      return null;
    }

    // Find the most recent successful simulation
    const recentSimulation = raceSimulations
      .filter(sim => sim.is_completed && (sim.results.confidence as any) > 0.7)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!recentSimulation) {
      return null;
    }

    const { results } = recentSimulation;
    
    return {
      pitLap: results.optimal_pit_lap || 20,
      expectedGain: results.tire_degradation_impact || 0,
      confidence: results.confidence || 0.5
    };
  },

  clearAnalytics: () => {
    set({
      performanceAnalyses: [],
      raceSimulations: [],
      competitorAnalyses: [],
      currentPerformance: null,
      currentCompetitorAnalysis: null,
      analyticsSummary: null,
    });
  },
});