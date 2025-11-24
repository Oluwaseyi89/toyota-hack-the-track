import { StateCreator } from 'zustand';
import { StrategyStore, PitStrategy, TireStrategy, StrategyState, FuelStrategy, StrategyPrediction } from '@/types/strategy';
import { getCookie } from '@/lib/get-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL! || 'http://localhost:8000';



export const initialStrategyState: StrategyState = {
  pitStrategies: [],
  tireStrategies: [],
  fuelStrategies: [],
  currentPrediction: null,
  isLoading: false,
  error: null,
  selectedPitStrategy: null,
  selectedTireStrategy: null,
  preferredStrategyType: null,
  riskTolerance: 'MEDIUM',
};

export const createStrategySlice: StateCreator<StrategyStore> = (set, get) => ({
  ...initialStrategyState,

  // ✅ Simple state setters
  setPitStrategies: (strategies: PitStrategy[]) => {
    set({ pitStrategies: strategies });
  },

  setTireStrategies: (strategies: TireStrategy[]) => {
    set({ tireStrategies: strategies });
  },

  setFuelStrategies: (strategies: FuelStrategy[]) => {
    set({ fuelStrategies: strategies });
  },

  setCurrentPrediction: (prediction: StrategyPrediction | null) => {
    set({ currentPrediction: prediction });
  },

  setSelectedPitStrategy: (strategy: PitStrategy | null) => {
    set({ selectedPitStrategy: strategy });
  },

  setSelectedTireStrategy: (strategy: TireStrategy | null) => {
    set({ selectedTireStrategy: strategy });
  },

  setPreferredStrategyType: (type: PitStrategy['strategy_type'] | null) => {
    set({ preferredStrategyType: type });
  },

  setRiskTolerance: (tolerance: 'LOW' | 'MEDIUM' | 'HIGH') => {
    set({ riskTolerance: tolerance });
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

  // ------------------------
  // 🔹 API Actions
  // ------------------------

  fetchCurrentPitStrategy: async () => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/strategy/pit/current/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch current pit strategy: ${response.statusText}`);
      }

      const result = await response.json();
      const strategy = result.data || result;

      // Update pit strategies list
      const existingStrategies = get().pitStrategies.filter(s => s.id !== strategy.id);
      set({ 
        pitStrategies: [strategy, ...existingStrategies],
        selectedPitStrategy: strategy,
        isLoading: false 
      });

      return { success: true, strategy };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch current pit strategy';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  fetchCurrentTireStrategy: async () => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/strategy/tire/current/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch current tire strategy: ${response.statusText}`);
      }

      const result = await response.json();
      const strategy = result.data || result;

      // Update tire strategies list
      const existingStrategies = get().tireStrategies.filter(s => s.id !== strategy.id);
      set({ 
        tireStrategies: [strategy, ...existingStrategies],
        selectedTireStrategy: strategy,
        isLoading: false 
      });

      return { success: true, strategy };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch current tire strategy';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  fetchComprehensivePrediction: async () => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/strategy/predictions/comprehensive/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch comprehensive prediction: ${response.statusText}`);
      }

      const result = await response.json();
      const prediction = result.data || result;

      // Update individual strategies from comprehensive prediction
      const { pit_strategy, tire_strategy, fuel_strategy } = prediction;
      
      const existingPitStrategies = get().pitStrategies.filter(s => s.id !== pit_strategy.id);
      const existingTireStrategies = get().tireStrategies.filter(s => s.id !== tire_strategy.id);
      const existingFuelStrategies = get().fuelStrategies.filter(s => s.id !== fuel_strategy.id);

      set({ 
        currentPrediction: prediction,
        pitStrategies: [pit_strategy, ...existingPitStrategies],
        tireStrategies: [tire_strategy, ...existingTireStrategies],
        fuelStrategies: [fuel_strategy, ...existingFuelStrategies],
        selectedPitStrategy: pit_strategy,
        selectedTireStrategy: tire_strategy,
        isLoading: false 
      });

      return { success: true, prediction };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch comprehensive prediction';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  createPitStrategy: async (data: Partial<PitStrategy>) => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/strategy/pit/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create pit strategy: ${response.statusText}`);
      }

      const result = await response.json();
      const strategy = result.data || result;

      // Add to strategies list
      set({ 
        pitStrategies: [strategy, ...get().pitStrategies],
        selectedPitStrategy: strategy,
        isLoading: false 
      });

      return { success: true, strategy };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create pit strategy';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  createTireStrategy: async (data: Partial<TireStrategy>) => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/strategy/tire/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create tire strategy: ${response.statusText}`);
      }

      const result = await response.json();
      const strategy = result.data || result;

      // Add to strategies list
      set({ 
        tireStrategies: [strategy, ...get().tireStrategies],
        selectedTireStrategy: strategy,
        isLoading: false 
      });

      return { success: true, strategy };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create tire strategy';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  updatePitStrategy: async (id: string, data: Partial<PitStrategy>) => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/strategy/pit/${id}/`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update pit strategy: ${response.statusText}`);
      }

      const result = await response.json();
      const strategy = result.data || result;

      // Update strategies list
      const updatedStrategies = get().pitStrategies.map(s => 
        s.id === id ? strategy : s
      );

      set({ 
        pitStrategies: updatedStrategies,
        selectedPitStrategy: strategy,
        isLoading: false 
      });

      return { success: true, strategy };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update pit strategy';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  deactivatePitStrategy: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/strategy/pit/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to deactivate pit strategy: ${response.statusText}`);
      }

      // Remove from active strategies list
      const updatedStrategies = get().pitStrategies.filter(s => s.id !== id);
      set({ 
        pitStrategies: updatedStrategies,
        selectedPitStrategy: null,
        isLoading: false 
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deactivate pit strategy';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  // ------------------------
  // 🔹 Utility Actions
  // ------------------------

  getOptimalPitWindow: () => {
    const { selectedPitStrategy, riskTolerance } = get();
    
    if (!selectedPitStrategy) return null;

    const baseLap = selectedPitStrategy.recommended_lap;
    const confidence = selectedPitStrategy.confidence;

    // Adjust window based on risk tolerance
    let windowSize = 0;
    switch (riskTolerance) {
      case 'LOW':
        windowSize = 2; // Smaller window for low risk
        break;
      case 'MEDIUM':
        windowSize = 3;
        break;
      case 'HIGH':
        windowSize = 5; // Larger window for high risk
        break;
    }

    return {
      startLap: Math.max(1, baseLap - windowSize),
      endLap: baseLap + windowSize,
      confidence: confidence
    };
  },

  getTireHealth: () => {
    const { selectedTireStrategy } = get();
    
    if (!selectedTireStrategy) {
      return { status: 'GOOD' as const, lapsRemaining: 20 }; // Default
    }

    const lapsRemaining = selectedTireStrategy.predicted_laps_remaining;
    const degradationRate = selectedTireStrategy.degradation_rate;

    let status: 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    
    if (lapsRemaining > 15 && degradationRate < 0.1) {
      status = 'GOOD';
    } else if (lapsRemaining > 10 && degradationRate < 0.15) {
      status = 'FAIR';
    } else if (lapsRemaining > 5 && degradationRate < 0.2) {
      status = 'POOR';
    } else {
      status = 'CRITICAL';
    }

    return { status, lapsRemaining };
  },

  clearStrategies: () => {
    set({
      pitStrategies: [],
      tireStrategies: [],
      fuelStrategies: [],
      currentPrediction: null,
      selectedPitStrategy: null,
      selectedTireStrategy: null,
    });
  },
});