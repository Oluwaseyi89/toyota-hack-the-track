'use client';

import { 
  useStrategyData, 
  useAuthStatus, 
  useRootStore 
} from '@/store';

import { useEffect, useRef, useState } from 'react';

export default function StrategyView() {
  const isInitializedRef = useRef(false);
  const retryCountRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pit' | 'tire' | 'fuel' | 'overview'>('overview');

  /** ----------------------------
   *  SELECTORS FROM UNIFIED STORE
   *  ---------------------------- */
  const { user } = useAuthStatus();

  const {
    pitStrategies,
    tireStrategies,
    fuelStrategies,
    currentPrediction,
    selectedPitStrategy,
    selectedTireStrategy,
    preferredStrategyType,
    riskTolerance,
    isLoading: strategyLoading,
  } = useStrategyData();

  /** -----------------------------------
   *  ACTIONS MUST BE SELECTED INDIVIDUALLY
   *  ----------------------------------- */
  const fetchComprehensivePrediction = useRootStore((s) => s.fetchComprehensivePrediction);
  const fetchCurrentPitStrategy = useRootStore((s) => s.fetchCurrentPitStrategy);
  const fetchCurrentTireStrategy = useRootStore((s) => s.fetchCurrentTireStrategy);
  const setSelectedPitStrategy = useRootStore((s) => s.setSelectedPitStrategy);
  const setSelectedTireStrategy = useRootStore((s) => s.setSelectedTireStrategy);
  const setPreferredStrategyType = useRootStore((s) => s.setPreferredStrategyType);
  const setRiskTolerance = useRootStore((s) => s.setRiskTolerance);
  const getOptimalPitWindow = useRootStore((s) => s.getOptimalPitWindow);
  const getTireHealth = useRootStore((s) => s.getTireHealth);

  /** --------------------------------------------------
   *   INITIALIZATION
   *  --------------------------------------------------*/
  useEffect(() => {
    const MAX_RETRIES = 2;
    
    if (isInitializedRef.current || retryCountRef.current >= MAX_RETRIES) {
      return;
    }
    
    isInitializedRef.current = true;
    retryCountRef.current++;

    const initializeStrategy = async () => {
      try {
        console.log(`🚀 Initializing strategy data (attempt ${retryCountRef.current}/${MAX_RETRIES})...`);
        setIsLoading(true);

        await fetchComprehensivePrediction();

        console.log('✅ Strategy API calls completed');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
        console.error(`❌ Strategy initialization failed:`, errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initializeStrategy();
  }, []);

  /** ----------------------------
   *  UTILITY FUNCTIONS
   *  ---------------------------- */
  const optimalPitWindow = getOptimalPitWindow();
  const tireHealth = getTireHealth();

  const getStrategyTypeDisplay = (strategyType: string) => {
    const strategyMap: { [key: string]: string } = {
      'EARLY': 'Early Stop',
      'MIDDLE': 'Middle Stop', 
      'LATE': 'Late Stop',
      'UNDERCUT': 'Undercut',
      'OVERCUT': 'Overcut'
    };
    return strategyMap[strategyType] || strategyType;
  };

  const getStrategyTypeColor = (strategyType: string) => {
    const colorMap: { [key: string]: string } = {
      'EARLY': 'bg-blue-100 text-blue-800 border-blue-200',
      'MIDDLE': 'bg-green-100 text-green-800 border-green-200',
      'LATE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'UNDERCUT': 'bg-purple-100 text-purple-800 border-purple-200',
      'OVERCUT': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colorMap[strategyType] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getRiskToleranceColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /** ----------------------------
   *  LOADING UI
   *  ---------------------------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-300 mt-2">Loading strategy data...</p>
          {retryCountRef.current > 1 && (
            <p className="text-xs text-gray-400 mt-2">Attempt {retryCountRef.current} of 2</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Strategy Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Race Strategy Center</h1>
            <p className="text-gray-300 mt-1">
              AI-powered strategy recommendations and analysis
            </p>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-400">Strategy Engineer</div>
            <div className="font-semibold text-white">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-xs text-gray-400 capitalize">
              {user?.role?.toLowerCase().replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      {/* Risk Tolerance & Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-300 text-sm mb-2">Risk Tolerance</div>
          <div className="flex space-x-2">
            {['LOW', 'MEDIUM', 'HIGH'].map((risk) => (
              <button
                key={risk}
                onClick={() => setRiskTolerance(risk as any)}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                  riskTolerance === risk 
                    ? getRiskToleranceColor(risk)
                    : 'bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600'
                }`}
              >
                {risk}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-300 text-sm mb-2">Preferred Strategy</div>
          <div className="text-white font-semibold">
            {preferredStrategyType ? getStrategyTypeDisplay(preferredStrategyType) : 'Auto-Select'}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-300 text-sm mb-2">Last Updated</div>
          <div className="text-white font-semibold">
            {currentPrediction?.timestamp 
              ? new Date(currentPrediction.timestamp).toLocaleTimeString() 
              : 'Never'
            }
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 border border-gray-700 w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'pit', label: 'Pit Strategy', icon: '⏱️' },
            { id: 'tire', label: 'Tire Analysis', icon: '🛞' },
            { id: 'fuel', label: 'Fuel Strategy', icon: '⛽' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Current Strategy */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-white text-lg font-semibold mb-4">Current Strategy</h3>
              {currentPrediction ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-750 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Pit Strategy</div>
                      <div className="text-white font-bold text-lg">
                        {getStrategyTypeDisplay(currentPrediction.pit_strategy.strategy_type)}
                      </div>
                      <div className="text-blue-400 text-sm">
                        Lap {currentPrediction.pit_strategy.recommended_lap}
                      </div>
                    </div>
                    <div className="bg-gray-750 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Confidence</div>
                      <div className="text-white font-bold text-lg">
                        {(currentPrediction.pit_strategy.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  
                  {optimalPitWindow && (
                    <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700">
                      <div className="text-blue-300 text-sm font-medium mb-2">Optimal Pit Window</div>
                      <div className="text-white font-bold text-xl">
                        Laps {optimalPitWindow.startLap} - {optimalPitWindow.endLap}
                      </div>
                      <div className="text-blue-400 text-sm">
                        {(optimalPitWindow.confidence * 100).toFixed(0)}% confidence
                      </div>
                    </div>
                  )}

                  <div className="text-gray-300 text-sm">
                    {currentPrediction.pit_strategy.reasoning}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">🎯</div>
                  <p>No strategy prediction available</p>
                </div>
              )}
            </div>

            {/* Tire & Fuel Status */}
            <div className="space-y-6">
              {/* Tire Health */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white text-lg font-semibold mb-4">Tire Health</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Status</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      tireHealth.status === 'GOOD' ? 'bg-green-100 text-green-800' :
                      tireHealth.status === 'FAIR' ? 'bg-yellow-100 text-yellow-800' :
                      tireHealth.status === 'POOR' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {tireHealth.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Laps Remaining</span>
                    <span className="text-white font-bold">{tireHealth.lapsRemaining}</span>
                  </div>
                  {selectedTireStrategy && (
                    <div className="bg-gray-750 rounded-lg p-3">
                      <div className="text-gray-400 text-xs">Optimal Change</div>
                      <div className="text-white font-semibold">
                        Lap {selectedTireStrategy.optimal_change_lap}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fuel Strategy */}
              {currentPrediction?.fuel_strategy && (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-white text-lg font-semibold mb-4">Fuel Strategy</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Fuel</span>
                      <span className="text-white font-semibold">
                        {currentPrediction.fuel_strategy.current_fuel}L
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Laps Remaining</span>
                      <span className="text-white font-semibold">
                        {currentPrediction.fuel_strategy.predicted_laps_remaining}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Consumption</span>
                      <span className="text-white font-semibold">
                        {currentPrediction.fuel_strategy.consumption_rate.toFixed(2)} L/lap
                      </span>
                    </div>
                    {currentPrediction.fuel_strategy.need_to_conserve && (
                      <div className="bg-yellow-900/30 rounded-lg p-3 border border-yellow-700">
                        <div className="text-yellow-300 text-sm font-medium">Fuel Saving Required</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pit Strategy Tab */}
        {activeTab === 'pit' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-white text-lg font-semibold mb-4">Pit Strategy Recommendations</h3>
              {pitStrategies.length > 0 ? (
                <div className="space-y-4">
                  {pitStrategies.map((strategy) => (
                    <div 
                      key={strategy.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedPitStrategy?.id === strategy.id
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-gray-600 bg-gray-750 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStrategyTypeColor(strategy.strategy_type)}`}>
                              {getStrategyTypeDisplay(strategy.strategy_type)}
                            </span>
                            <span className="text-white font-bold text-lg">
                              Lap {strategy.recommended_lap}
                            </span>
                          </div>
                          <div className="text-gray-300 text-sm mt-2">
                            {strategy.reasoning}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold text-xl">
                            {(strategy.confidence * 100).toFixed(0)}%
                          </div>
                          <div className="text-gray-400 text-sm">Confidence</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-gray-400 text-sm">
                          Created: {new Date(strategy.created_at).toLocaleTimeString()}
                        </div>
                        <button
                          onClick={() => setSelectedPitStrategy(strategy)}
                          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                            selectedPitStrategy?.id === strategy.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                        >
                          {selectedPitStrategy?.id === strategy.id ? 'Selected' : 'Select'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">⏱️</div>
                  <p>No pit strategies available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tire Analysis Tab */}
        {activeTab === 'tire' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-white text-lg font-semibold mb-4">Tire Strategy Analysis</h3>
              {tireStrategies.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {tireStrategies.map((strategy) => (
                    <div 
                      key={strategy.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedTireStrategy?.id === strategy.id
                          ? 'border-green-500 bg-green-900/20'
                          : 'border-gray-600 bg-gray-750 hover:border-gray-500'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Optimal Change</span>
                          <span className="text-white font-bold text-lg">
                            Lap {strategy.optimal_change_lap}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Laps Remaining</span>
                          <span className="text-white font-semibold">
                            {strategy.predicted_laps_remaining}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Degradation</span>
                          <span className="text-white font-semibold">
                            {(strategy.degradation_rate * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Confidence</span>
                          <span className="text-white font-semibold">
                            {(strategy.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedTireStrategy(strategy)}
                          className={`w-full py-2 rounded text-sm font-medium transition-colors ${
                            selectedTireStrategy?.id === strategy.id
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                        >
                          {selectedTireStrategy?.id === strategy.id ? 'Active Strategy' : 'Set as Active'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">🛞</div>
                  <p>No tire strategies available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fuel Strategy Tab */}
        {activeTab === 'fuel' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-white text-lg font-semibold mb-4">Fuel Strategy Management</h3>
              {fuelStrategies.length > 0 ? (
                <div className="space-y-4">
                  {fuelStrategies.map((strategy) => (
                    <div key={strategy.id} className="p-4 rounded-lg border border-gray-600 bg-gray-750">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-gray-700 rounded-lg">
                          <div className="text-gray-400 text-sm">Current Fuel</div>
                          <div className="text-white font-bold text-xl">
                            {strategy.current_fuel}L
                          </div>
                        </div>
                        <div className="text-center p-3 bg-gray-700 rounded-lg">
                          <div className="text-gray-400 text-sm">Laps Remaining</div>
                          <div className="text-white font-bold text-xl">
                            {strategy.predicted_laps_remaining}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-gray-700 rounded-lg">
                          <div className="text-gray-400 text-sm">Consumption</div>
                          <div className="text-white font-bold text-xl">
                            {strategy.consumption_rate.toFixed(2)}
                          </div>
                          <div className="text-gray-400 text-xs">L/lap</div>
                        </div>
                        <div className="text-center p-3 bg-gray-700 rounded-lg">
                          <div className="text-gray-400 text-sm">Status</div>
                          <div className={`text-sm font-bold ${
                            strategy.need_to_conserve ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            {strategy.need_to_conserve ? 'CONSERVE' : 'NORMAL'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">⛽</div>
                  <p>No fuel strategies available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}