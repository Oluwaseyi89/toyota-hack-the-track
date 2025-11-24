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

export default function DashboardPage() {
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
   *  ERROR STATE
   *  ---------------------------- */
  // if (initializationError) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gray-50">
  //       <div className="text-center text-red-600 max-w-md">
  //         <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
  //           <span className="text-red-500 text-2xl">⚠️</span>
  //         </div>
  //         <h2 className="text-xl font-bold mb-2">Failed to Load Dashboard</h2>
  //         <p className="text-sm text-gray-600 mb-4">{initializationError}</p>
  //         <p className="text-xs text-gray-500 mb-4">Please check your backend connection and try again.</p>
  //         <button 
  //           onClick={() => window.location.reload()}
  //           className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
  //         >
  //           Retry
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  /** ----------------------------
   *  LOADING UI
   *  ---------------------------- */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="flex justify-center items-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-red-800 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-white font-bold text-xl">GR</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Toyota GR Racing</h2>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p className="text-gray-500">Loading real-time racing analytics...</p>
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
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Dashboard Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Racing Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Real-time analytics for {selectedVehicle?.driver || 'Toyota GR Team'}
            </p>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500">Welcome back,</div>
            <div className="font-semibold text-gray-900">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-xs text-gray-500 capitalize">
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

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Position</span>
                  <span className="font-medium">{currentTelemetry?.position ?? '-'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Gap to Leader</span>
                  <span className="font-medium">
                    {currentTelemetry?.gap_to_leader
                      ? `${currentTelemetry.gap_to_leader.toFixed(2)}s`
                      : '-'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Current Lap</span>
                  <span className="font-medium">{currentTelemetry?.lap_number ?? '-'}</span>
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

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Strategy Recommendations
            </h3>

            {currentPrediction?.pit_strategy ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Optimal Pit Lap</span>
                  <span className="font-bold text-lg text-blue-600">
                    {currentPrediction.pit_strategy.recommended_lap}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Strategy</span>
                  <span className="font-medium capitalize">
                    {currentPrediction.pit_strategy.strategy_type.toLowerCase()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Confidence</span>
                  <span className="font-medium">
                    {(currentPrediction.pit_strategy.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                {pitWindow && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-800">
                      Pit Window: Laps {pitWindow.startLap} – {pitWindow.endLap}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">
                No strategy recommendations available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

