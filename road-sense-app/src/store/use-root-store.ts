import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// Import all slices
import { createAuthSlice } from "./slices/auth-slice";
import { createTelemetrySlice } from "./slices/telemetry-slice";
import { createStrategySlice } from "./slices/strategy-slice";
import { createAnalyticsSlice } from "./slices/analytics-slice";
import { createAlertsSlice } from "./slices/alerts-slice";

// Import types
import type { RootStore } from "@/types/store";
import type { StateCreator, StoreApi } from "zustand";

/**
 * 🔹 useRootStore — unified Zustand store integrating all slices
 * Follows the exact same pattern as your previous implementation
 */
export const useRootStore = create<RootStore>()(
  devtools(
    persist(
      immer((set, get, store) => {
        // Typecast set/get for compatibility with slices
        const _set = set as unknown as Parameters<StateCreator<RootStore>>[0];
        const _get = get as unknown as Parameters<StateCreator<RootStore>>[1];
        const _store = store as StoreApi<RootStore>;

        return {
          // Auth slice
          ...createAuthSlice(_set, _get, _store),
          
          // Telemetry slice  
          ...createTelemetrySlice(_set, _get, _store),
          
          // Strategy slice
          ...createStrategySlice(_set, _get, _store),
          
          // Analytics slice
          ...createAnalyticsSlice(_set, _get, _store),
          
          // Alerts slice
          ...createAlertsSlice(_set, _get, _store),
        };
      }),
      {
        name: "toyota-gr-racing-store",
        partialize: (state) => ({
          // Auth persistence
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          permissions: state.permissions,
          
          // Telemetry persistence
          selectedVehicle: state.selectedVehicle,
          timeRange: state.timeRange,
          
          // Strategy persistence  
          preferredStrategyType: state.preferredStrategyType,
          riskTolerance: state.riskTolerance,
          
          // Analytics persistence
          selectedTimeRange: state.selectedTimeRange,
          analysisDepth: state.analysisDepth,
          
          // Alerts persistence
          alertFilters: state.alertFilters,
        }),
        // Optional: Add migration if store structure changes
        // version: 1,
        // migrate: (persistedState, version) => {
        //   if (version === 0) {
        //     // Migrate from version 0 to 1
        //   }
        //   return persistedState as RootStore;
        // },
      }
    ),
    { 
      name: "ToyotaGRRootStore",
      // Optional: Store tracing in development
      // trace: process.env.NODE_ENV !== 'production',
    }
  )
);

/**
 * 🔹 Store initialization hook for app startup
 */
export const useInitializeStore = () => {
  const {
    // Auth actions
    getCurrentUser,
    
    // Telemetry actions
    fetchVehicles,
    connectWebSocket,
    
    // Strategy actions
    fetchComprehensivePrediction,
    
    // Analytics actions
    fetchAnalyticsSummary,
    
    // Alerts actions
    fetchAlerts,
    fetchAlertSummary,
  } = useRootStore();

  const initializeApp = async () => {
    try {
      console.log("Initializing Toyota GR Racing Store...");
      
      // Initialize authentication state
      await getCurrentUser();
      
      // Initialize telemetry data
      await fetchVehicles();
      connectWebSocket(); // Start WebSocket connection
      
      // Initialize strategy data
      await fetchComprehensivePrediction();
      
      // Initialize analytics data
      await fetchAnalyticsSummary();
      
      // Initialize alerts data
      await fetchAlerts();
      await fetchAlertSummary();
      
      console.log("Toyota GR Racing Store initialized successfully");
    } catch (error) {
      console.error("Failed to initialize store:", error);
    }
  };

  return { initializeApp };
};

/**
 * 🔹 Store reset hook for logout/cleanup
 */
export const useResetStore = () => {
  const {
    // Auth actions
    setUser,
    
    // Telemetry actions
    disconnectWebSocket,
    clearTelemetryData,
    
    // Strategy actions
    clearStrategies,
    
    // Analytics actions
    clearAnalytics,
    
    // Alerts actions
    clearAlerts,
  } = useRootStore();

  const resetStore = () => {
    console.log("Resetting Toyota GR Racing Store...");
    
    // Reset all slices to initial state
    setUser(null);
    disconnectWebSocket();
    clearTelemetryData();
    clearStrategies();
    clearAnalytics();
    clearAlerts();
    
    console.log("Toyota GR Racing Store reset successfully");
  };

  return { resetStore };
};

/**
 * 🔹 Custom hooks for common store operations
 */

// Hook for authentication status
export const useAuthStatus = () => {
  const { user, isAuthenticated, loading, permissions } = useRootStore();
  return { user, isAuthenticated, loading, permissions };
};



// In src/store/use-root-store.ts - update these hooks:

// Hook for real-time telemetry data
export const useTelemetryData = () => {
  const { 
    vehicles, 
    telemetryData, 
    liveTelemetry, 
    weatherData, 
    isWebSocketConnected,
    selectedVehicle,
    isLoading  // Add this line
  } = useRootStore();
  
  return { 
    vehicles, 
    telemetryData, 
    liveTelemetry, 
    weatherData, 
    isWebSocketConnected,
    selectedVehicle,
    isLoading  // Add this line
  };
};

// Hook for alerts data
export const useAlertsData = () => {
  const {
    alerts,
    activeAlerts,
    unacknowledgedAlerts,
    alertSummary,
    getCriticalAlerts,
    hasUnacknowledgedCriticalAlerts,
    isLoading  // Add this line
  } = useRootStore();
  
  const criticalAlerts = getCriticalAlerts();
  const hasCriticalAlerts = hasUnacknowledgedCriticalAlerts();
  
  return {
    alerts,
    activeAlerts,
    unacknowledgedAlerts,
    alertSummary,
    criticalAlerts,
    hasCriticalAlerts,
    isLoading  // Add this line
  };
};




// Hook for strategy data
export const useStrategyData = () => {
  const {
    pitStrategies,
    tireStrategies,
    currentPrediction,
    selectedPitStrategy,
    getOptimalPitWindow,
    getTireHealth
  } = useRootStore();
  
  const pitWindow = getOptimalPitWindow();
  const tireHealth = getTireHealth();
  
  return {
    pitStrategies,
    tireStrategies,
    currentPrediction,
    selectedPitStrategy,
    pitWindow,
    tireHealth
  };
};

// Hook for analytics data
export const useAnalyticsData = () => {
  const {
    performanceAnalyses,
    raceSimulations,
    competitorAnalyses,
    analyticsSummary,
    getPerformanceTrend,
    getCompetitorThreats,
    getOptimalStrategy
  } = useRootStore();
  
  const performanceTrend = getPerformanceTrend();
  const competitorThreats = getCompetitorThreats();
  const optimalStrategy = getOptimalStrategy();
  
  return {
    performanceAnalyses,
    raceSimulations,
    competitorAnalyses,
    analyticsSummary,
    performanceTrend,
    competitorThreats,
    optimalStrategy
  };
};



/**
 * 🔹 Store subscription hooks for real-time updates
 */

// Subscribe to WebSocket connection changes
export const useWebSocketStatus = () => {
  const isWebSocketConnected = useRootStore(state => state.isWebSocketConnected);
  const webSocketError = useRootStore(state => state.webSocketError);
  
  return { isWebSocketConnected, webSocketError };
};

// Subscribe to critical alerts
export const useCriticalAlerts = () => {
  const criticalAlerts = useRootStore(state => 
    state.getAlertsBySeverity('CRITICAL').concat(state.getAlertsBySeverity('HIGH'))
  );
  
  return criticalAlerts;
};

// Subscribe to real-time telemetry updates
export const useLiveTelemetry = () => {
  const liveTelemetry = useRootStore(state => state.liveTelemetry);
  const lastUpdate = useRootStore(state => state.lastUpdate);
  
  return { liveTelemetry, lastUpdate };
};