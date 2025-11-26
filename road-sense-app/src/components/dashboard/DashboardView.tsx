'use client';

import { 
  useTelemetryData, 
  useStrategyData, 
  useAlertsData, 
  useAuthStatus, 
  useRootStore 
} from '@/store';

import RealTimeMetrics from '@/components/dashboard/RealTimeMetrics';
import TireWearGauge from '@/components/dashboard/TireWearGauge';
import FuelIndicator from '@/components/dashboard/FuelIndicator';
import PaceChart from '@/components/dashboard/PaceChart';
import StrategyTimeline from '@/components/dashboard/StrategyTimeline';
import AlertsPanel from '@/components/dashboard/AlertsPanel';

import { useEffect, useRef, useState } from 'react';

export default function DashboardView() {
  const isInitializedRef = useRef(false);
  const retryCountRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  /** ----------------------------
   *  SELECTORS FROM UNIFIED STORE
   *  ---------------------------- */
  const { user } = useAuthStatus();

  const {
    liveTelemetry,
    telemetryData,
    weatherData,
    selectedVehicle,
  } = useTelemetryData();

  const {
    pitStrategies,
    tireStrategies,
    currentPrediction,
    pitWindow,
    tireHealth
  } = useStrategyData();

  const {
    activeAlerts,
    unacknowledgedAlerts,
  } = useAlertsData();

  /** -----------------------------------
   *  ACTIONS MUST BE SELECTED INDIVIDUALLY
   *  ----------------------------------- */
  const fetchCurrentTelemetry = useRootStore((s) => s.fetchCurrentTelemetry);
  const fetchCurrentWeather = useRootStore((s) => s.fetchCurrentWeather);
  const fetchComprehensivePrediction = useRootStore((s) => s.fetchComprehensivePrediction);
  const fetchAlerts = useRootStore((s) => s.fetchAlerts);

  /** --------------------------------------------------
   *   INITIALIZATION – SIMPLE & SAFE
   *  --------------------------------------------------*/
  useEffect(() => {
    const MAX_RETRIES = 2;
    
    // Prevent multiple initializations and limit retries
    if (isInitializedRef.current || retryCountRef.current >= MAX_RETRIES) {
      return;
    }
    
    isInitializedRef.current = true;
    retryCountRef.current++;

    const initializeDashboard = async () => {
      try {
        console.log(`🚀 Initializing dashboard data (attempt ${retryCountRef.current}/${MAX_RETRIES})...`);
        setIsLoading(true);
        setInitializationError(null);

        // Simply execute API calls - no state validation that causes loops
        await fetchCurrentTelemetry();
        await fetchCurrentWeather();
        await fetchComprehensivePrediction();
        await fetchAlerts();

        console.log('✅ Dashboard API calls completed');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
        console.error(`❌ Dashboard initialization failed (attempt ${retryCountRef.current}/${MAX_RETRIES}):`, errorMessage);
        
        // Only set error after max retries to break the loop
        if (retryCountRef.current >= MAX_RETRIES) {
          setInitializationError(`Failed to load dashboard data: ${errorMessage}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, []); // Empty dependency array - runs once only

  /** ----------------------------
   *  LOADING UI
   *  ---------------------------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="flex justify-center items-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-red-800 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-white font-bold text-xl">GR</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Toyota GR Racing</h2>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p className="text-gray-300">Loading real-time racing analytics...</p>
          {retryCountRef.current > 1 && (
            <p className="text-xs text-gray-400 mt-2">Attempt {retryCountRef.current} of 2</p>
          )}
        </div>
      </div>
    );
  }

  /** ----------------------------
   *  SAFE CURRENT TELEMETRY
   *  ---------------------------- */
  const currentTelemetry = liveTelemetry?.[0] || telemetryData?.[0];

  return (
    <div className="p-6">
      {/* Dashboard Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Racing Dashboard</h1>
            <p className="text-gray-300 mt-1">
              Real-time analytics for {selectedVehicle?.driver || 'Toyota GR Team'}
            </p>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-400">Welcome back,</div>
            <div className="font-semibold text-white">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-xs text-gray-400 capitalize">
              {user?.role?.toLowerCase().replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <RealTimeMetrics 
              telemetry={currentTelemetry}
              weather={weatherData}
              vehicles={liveTelemetry}
            />
          </div>

          <div className="space-y-6">
            <TireWearGauge 
              health={tireHealth}
              strategy={tireStrategies?.[0]}
            />

            <FuelIndicator 
              strategies={currentPrediction?.fuel_strategy}
            />

            <div className="bg-gray-800 rounded-lg shadow p-4 border border-gray-700">
              <h3 className="font-semibold text-white mb-3">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Position</span>
                  <span className="font-medium text-white">{currentTelemetry?.position ?? '-'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Gap to Leader</span>
                  <span className="font-medium text-white">
                    {currentTelemetry?.gap_to_leader
                      ? `${currentTelemetry.gap_to_leader.toFixed(2)}s`
                      : '-'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Current Lap</span>
                  <span className="font-medium text-white">{currentTelemetry?.lap_number ?? '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PaceChart telemetryData={telemetryData} />

          <StrategyTimeline 
            pitStrategies={pitStrategies}
            currentPrediction={currentPrediction}
            pitWindow={pitWindow}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AlertsPanel />
          </div>

          <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
            <h3 className="font-semibold text-white mb-4">
              Strategy Recommendations
            </h3>

            {currentPrediction?.pit_strategy ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Optimal Pit Lap</span>
                  <span className="font-bold text-lg text-blue-400">
                    {currentPrediction.pit_strategy.recommended_lap}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Strategy</span>
                  <span className="font-medium text-white capitalize">
                    {currentPrediction.pit_strategy.strategy_type.toLowerCase()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Confidence</span>
                  <span className="font-medium text-white">
                    {(currentPrediction.pit_strategy.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                {pitWindow && (
                  <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-700">
                    <div className="text-sm text-blue-300">
                      Pit Window: Laps {pitWindow.startLap} – {pitWindow.endLap}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400 text-center py-4">
                No strategy recommendations available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}