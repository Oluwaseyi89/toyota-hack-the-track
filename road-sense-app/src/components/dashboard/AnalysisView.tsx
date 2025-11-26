'use client';

import { 
  useAnalyticsData, 
  useAuthStatus, 
  useRootStore 
} from '@/store';

import { useEffect, useRef, useState } from 'react';

export default function AnalysisView() {
  const isInitializedRef = useRef(false);
  const retryCountRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'simulations' | 'competitors'>('overview');
  const [simulationParams, setSimulationParams] = useState({
    scenario: 'normal',
    weather: 'dry',
    strategy: 'balanced'
  });

  /** ----------------------------
   *  SELECTORS FROM UNIFIED STORE
   *  ---------------------------- */
  const { user } = useAuthStatus();

  const {
    performanceAnalyses,
    raceSimulations,
    competitorAnalyses,
    currentPerformance,
    analyticsSummary,
    isLoading: analyticsLoading,
    isSimulating,
    simulationProgress,
    selectedTimeRange,
    analysisDepth,
  } = useAnalyticsData();

  /** -----------------------------------
   *  ACTIONS MUST BE SELECTED INDIVIDUALLY
   *  ----------------------------------- */
  const fetchAnalyticsSummary = useRootStore((s) => s.fetchAnalyticsSummary);
  const fetchCurrentPerformance = useRootStore((s) => s.fetchCurrentPerformance);
  const runRaceSimulation = useRootStore((s) => s.runRaceSimulation);
  const fetchRecentSimulations = useRootStore((s) => s.fetchRecentSimulations);
  const fetchPerformanceHistory = useRootStore((s) => s.fetchPerformanceHistory);
  const setSelectedTimeRange = useRootStore((s) => s.setSelectedTimeRange);
  const setAnalysisDepth = useRootStore((s) => s.setAnalysisDepth);
  const getPerformanceTrend = useRootStore((s) => s.getPerformanceTrend);
  const getCompetitorThreats = useRootStore((s) => s.getCompetitorThreats);
  const getOptimalStrategy = useRootStore((s) => s.getOptimalStrategy);

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

    const initializeAnalytics = async () => {
      try {
        console.log(`🚀 Initializing analytics data (attempt ${retryCountRef.current}/${MAX_RETRIES})...`);
        setIsLoading(true);

        await fetchAnalyticsSummary();
        await fetchCurrentPerformance();

        console.log('✅ Analytics API calls completed');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
        console.error(`❌ Analytics initialization failed:`, errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAnalytics();
  }, []);

  /** ----------------------------
   *  UTILITY FUNCTIONS
   *  ---------------------------- */
  const performanceTrend = getPerformanceTrend();
  const competitorThreats = getCompetitorThreats();
  const optimalStrategy = getOptimalStrategy();

  const handleRunSimulation = async () => {
    try {
      await runRaceSimulation(simulationParams);
    } catch (error) {
      console.error('Failed to run simulation:', error);
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'IMPROVING': return 'text-green-400';
      case 'DECLINING': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (impact: number) => {
    if (impact > 0.1) return 'text-red-400';
    if (impact > 0.05) return 'text-yellow-400';
    return 'text-green-400';
  };

  /** ----------------------------
   *  LOADING UI
   *  ---------------------------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-300 mt-2">Loading analytics data...</p>
          {retryCountRef.current > 1 && (
            <p className="text-xs text-gray-400 mt-2">Attempt {retryCountRef.current} of 2</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Analysis Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Advanced Analytics</h1>
            <p className="text-gray-300 mt-1">
              Performance insights, simulations, and competitor analysis
            </p>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-400">Data Analyst</div>
            <div className="font-semibold text-white">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-xs text-gray-400 capitalize">
              {user?.role?.toLowerCase().replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-300 text-sm mb-2">Time Range</div>
          <div className="flex space-x-2">
            {['realtime', 'session', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range as any)}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                  selectedTimeRange === range 
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-300 text-sm mb-2">Analysis Depth</div>
          <div className="flex space-x-2">
            {['BASIC', 'DETAILED', 'ADVANCED'].map((depth) => (
              <button
                key={depth}
                onClick={() => setAnalysisDepth(depth as any)}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                  analysisDepth === depth 
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600'
                }`}
              >
                {depth}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-300 text-sm mb-2">Last Analysis</div>
          <div className="text-white font-semibold">
            {analyticsSummary?.timestamp 
              ? new Date(analyticsSummary.timestamp).toLocaleTimeString() 
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
            { id: 'performance', label: 'Performance', icon: '⚡' },
            { id: 'simulations', label: 'Simulations', icon: '🎮' },
            { id: 'competitors', label: 'Competitors', icon: '🎯' },
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
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Performance Summary */}
            <div className="xl:col-span-2 space-y-6">
              {/* Performance Trend */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white text-lg font-semibold mb-4">Performance Trend</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-750 rounded-lg">
                    <div className="text-gray-400 text-sm">Trend</div>
                    <div className={`text-2xl font-bold ${getTrendColor(performanceTrend.trend)}`}>
                      {performanceTrend.trend}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-750 rounded-lg">
                    <div className="text-gray-400 text-sm">Change</div>
                    <div className="text-white font-bold text-2xl">
                      {performanceTrend.change.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-750 rounded-lg">
                    <div className="text-gray-400 text-sm">Analyses</div>
                    <div className="text-white font-bold text-2xl">
                      {performanceAnalyses.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Performance */}
              {currentPerformance && (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-white text-lg font-semibold mb-4">Current Performance</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-750 rounded-lg">
                      <div className="text-gray-400 text-xs">Lap Time</div>
                      <div className="text-white font-bold">
                        {currentPerformance.actual_lap_time ? currentPerformance.actual_lap_time.toFixed(3) + 's' : '--'}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-750 rounded-lg">
                      <div className="text-gray-400 text-xs">Tire Impact</div>
                      <div className={`font-bold ${getImpactColor(currentPerformance.tire_degradation_impact)}`}>
                        {(currentPerformance.tire_degradation_impact * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-750 rounded-lg">
                      <div className="text-gray-400 text-xs">Fuel Impact</div>
                      <div className={`font-bold ${getImpactColor(currentPerformance.fuel_impact)}`}>
                        {(currentPerformance.fuel_impact * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-750 rounded-lg">
                      <div className="text-gray-400 text-xs">Weather Impact</div>
                      <div className={`font-bold ${getImpactColor(currentPerformance.weather_impact)}`}>
                        {(currentPerformance.weather_impact * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="space-y-6">
              {/* Competitor Threats */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white text-lg font-semibold mb-4">Competitor Threats</h3>
                <div className="space-y-3">
                  {competitorThreats.slice(0, 3).map((threat, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-750 rounded-lg">
                      <div>
                        <div className="text-white font-medium">Vehicle #{threat.vehicle?.number}</div>
                        <div className="text-gray-400 text-xs">Lap {threat.lap_number}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getThreatLevelColor(threat.threat_level)}`}>
                        {threat.threat_level}
                      </span>
                    </div>
                  ))}
                  {competitorThreats.length === 0 && (
                    <div className="text-center py-4 text-gray-400">
                      <div className="text-2xl mb-1">🛡️</div>
                      <p className="text-sm">No high threats detected</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Optimal Strategy */}
              {optimalStrategy && (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-white text-lg font-semibold mb-4">Optimal Strategy</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pit Lap</span>
                      <span className="text-white font-bold">{optimalStrategy.pitLap}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expected Gain</span>
                      <span className="text-green-400 font-bold">+{optimalStrategy.expectedGain.toFixed(2)}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Confidence</span>
                      <span className="text-white font-bold">{(optimalStrategy.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-white text-lg font-semibold mb-4">Performance Analysis History</h3>
              {performanceAnalyses.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Lap</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actual Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tire Impact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fuel Impact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Weather Impact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {performanceAnalyses.slice(0, 10).map((analysis) => (
                        <tr key={analysis.id} className="hover:bg-gray-750 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-white">{analysis.lap_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-300 font-mono">
                            {analysis.actual_lap_time ? analysis.actual_lap_time.toFixed(3) + 's' : '--'}
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium ${getImpactColor(analysis.tire_degradation_impact)}`}>
                            {(analysis.tire_degradation_impact * 100).toFixed(1)}%
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium ${getImpactColor(analysis.fuel_impact)}`}>
                            {(analysis.fuel_impact * 100).toFixed(1)}%
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium ${getImpactColor(analysis.weather_impact)}`}>
                            {(analysis.weather_impact * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {new Date(analysis.analysis_timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">📈</div>
                  <p>No performance analyses available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Simulations Tab */}
        {activeTab === 'simulations' && (
          <div className="space-y-6">
            {/* Simulation Controls */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-white text-lg font-semibold mb-4">Run New Simulation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Scenario</label>
                  <select 
                    value={simulationParams.scenario}
                    onChange={(e) => setSimulationParams(prev => ({ ...prev, scenario: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="normal">Normal Race</option>
                    <option value="safety_car">Safety Car</option>
                    <option value="wet_race">Wet Conditions</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Weather</label>
                  <select 
                    value={simulationParams.weather}
                    onChange={(e) => setSimulationParams(prev => ({ ...prev, weather: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="dry">Dry</option>
                    <option value="mixed">Mixed</option>
                    <option value="wet">Wet</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Strategy</label>
                  <select 
                    value={simulationParams.strategy}
                    onChange={(e) => setSimulationParams(prev => ({ ...prev, strategy: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="balanced">Balanced</option>
                    <option value="aggressive">Aggressive</option>
                    <option value="conservative">Conservative</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isSimulating 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSimulating ? `Running... ${simulationProgress}%` : 'Run Simulation'}
              </button>
            </div>

            {/* Recent Simulations */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-white text-lg font-semibold mb-4">Recent Simulations</h3>
              {raceSimulations.length > 0 ? (
                <div className="space-y-4">
                  {raceSimulations.slice(0, 5).map((simulation) => (
                    <div key={simulation.id} className="p-4 rounded-lg border border-gray-600 bg-gray-750">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-white font-semibold">
                            {simulation.parameters.scenario?.replace('_', ' ') || 'Unknown Scenario'}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {new Date(simulation.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          simulation.is_completed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {simulation.is_completed ? 'Completed' : 'Running'}
                        </div>
                      </div>
                      {simulation.is_completed && simulation.results && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-400">Predicted Position</div>
                            <div className="text-white font-semibold">
                              P{simulation.results.predicted_finish_position || '--'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400">Optimal Pit Lap</div>
                            <div className="text-white font-semibold">
                              {simulation.results.optimal_pit_lap || '--'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400">Confidence</div>
                            <div className="text-white font-semibold">
                              {simulation.results.confidence ? (simulation.results.confidence * 100).toFixed(0) + '%' : '--'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400">Total Time</div>
                            <div className="text-white font-semibold">
                              {simulation.results.expected_total_time ? simulation.results.expected_total_time.toFixed(0) + 's' : '--'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">🎮</div>
                  <p>No simulations available</p>
                  <p className="text-sm mt-2">Run a simulation to see results</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Competitors Tab */}
        {activeTab === 'competitors' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-white text-lg font-semibold mb-4">Competitor Analysis</h3>
              {competitorAnalyses.length > 0 ? (
                <div className="space-y-4">
                  {competitorAnalyses.slice(0, 8).map((analysis) => (
                    <div key={analysis.id} className="p-4 rounded-lg border border-gray-600 bg-gray-750">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-white font-semibold">
                            Vehicle #{analysis.vehicle?.number} - Lap {analysis.lap_number}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {new Date(analysis.analysis_timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getThreatLevelColor(analysis.threat_level)}`}>
                          {analysis.threat_level} Threat
                        </span>
                      </div>
                      {analysis.competitor_data && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {analysis.competitor_data.positions && (
                            <div>
                              <div className="text-gray-400">Positions</div>
                              <div className="text-white font-mono">
                                {Object.entries(analysis.competitor_data.positions).slice(0, 3).map(([id, pos]) => (
                                  <div key={id}>P{pos}</div>
                                ))}
                              </div>
                            </div>
                          )}
                          {analysis.competitor_data.gaps && (
                            <div>
                              <div className="text-gray-400">Gaps</div>
                              <div className="text-white font-mono">
                                {Object.entries(analysis.competitor_data.gaps).slice(0, 3).map(([id, gap]) => (
                                  <div key={id}>+{typeof gap === 'number' ? gap.toFixed(2) : gap}s</div>
                                ))}
                              </div>
                            </div>
                          )}
                          {analysis.competitor_data.lap_times && (
                            <div>
                              <div className="text-gray-400">Lap Times</div>
                              <div className="text-white font-mono">
                                {Object.entries(analysis.competitor_data.lap_times).slice(0, 3).map(([id, time]) => (
                                  <div key={id}>{typeof time === 'number' ? time.toFixed(3) : time}s</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">🎯</div>
                  <p>No competitor analyses available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}