'use client';

import { 
  useTelemetryData, 
  useAuthStatus, 
  useRootStore 
} from '@/store';

import { useEffect, useRef, useState } from 'react';

export default function TelemetryView() {
  const isInitializedRef = useRef(false);
  const retryCountRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'live' | 'historical' | 'analysis'>('live');

  /** ----------------------------
   *  SELECTORS FROM UNIFIED STORE
   *  ---------------------------- */
  const { user } = useAuthStatus();

  const {
    vehicles,
    telemetryData,
    liveTelemetry,
    weatherData,
    selectedVehicle,
    isWebSocketConnected,
    lastUpdate
  } = useTelemetryData();

  /** -----------------------------------
   *  ACTIONS MUST BE SELECTED INDIVIDUALLY
   *  ----------------------------------- */
  const fetchVehicles = useRootStore((s) => s.fetchVehicles);
  const fetchCurrentTelemetry = useRootStore((s) => s.fetchCurrentTelemetry);
  const fetchVehicleTelemetry = useRootStore((s) => s.fetchVehicleTelemetry);
  const fetchCurrentWeather = useRootStore((s) => s.fetchCurrentWeather);
  const connectWebSocket = useRootStore((s) => s.connectWebSocket);
  const disconnectWebSocket = useRootStore((s) => s.disconnectWebSocket);
  const setSelectedVehicle = useRootStore((s) => s.setSelectedVehicle);
  const simulateTelemetry = useRootStore((s) => s.simulateTelemetry);

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

    const initializeTelemetry = async () => {
      try {
        console.log(`🚀 Initializing telemetry data (attempt ${retryCountRef.current}/${MAX_RETRIES})...`);
        setIsLoading(true);
        setInitializationError(null);

        // Fetch initial data
        await fetchVehicles();
        await fetchCurrentTelemetry();
        await fetchCurrentWeather();

        // Connect to WebSocket for real-time updates
        connectWebSocket();

        console.log('✅ Telemetry API calls completed');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
        console.error(`❌ Telemetry initialization failed:`, errorMessage);
        
        if (retryCountRef.current >= MAX_RETRIES) {
          setInitializationError(`Failed to load telemetry data: ${errorMessage}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeTelemetry();

    // Cleanup WebSocket on unmount
    return () => {
      disconnectWebSocket();
    };
  }, []);

  /** ----------------------------
   *  HANDLERS
   *  ---------------------------- */
  const handleVehicleSelect = async (vehicleNumber: number) => {
    const vehicle = vehicles.find(v => v.number === vehicleNumber);
    setSelectedVehicle(vehicle || null);
    await fetchVehicleTelemetry(vehicleNumber);
  };

  const handleSimulateData = async () => {
    try {
      await simulateTelemetry();
      // Refresh data after simulation
      await fetchCurrentTelemetry();
    } catch (error) {
      console.error('Failed to simulate data:', error);
    }
  };

  /** ----------------------------
   *  DATA PROCESSING
   *  ---------------------------- */
  // Use TelemetryData for detailed metrics (has all fields)
  const currentTelemetry = telemetryData[0];
  // Use LiveTelemetry for real-time position/speed (limited fields)
  const currentLiveData = liveTelemetry[0];

  // Calculate performance metrics
  const bestLapTime = telemetryData.length > 0 
    ? Math.min(...telemetryData.map(t => t.lap_time_seconds))
    : currentTelemetry?.lap_time_seconds || 0;

  const averageLapTime = telemetryData.length > 0
    ? telemetryData.reduce((sum, t) => sum + t.lap_time_seconds, 0) / telemetryData.length
    : 0;

  /** ----------------------------
   *  LOADING UI
   *  ---------------------------- */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="flex justify-center items-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-r from-red-600 to-red-800 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-white font-bold text-2xl">GR</span>
              </div>
              <div className="absolute -inset-2 border-2 border-red-500 rounded-full animate-ping"></div>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Toyota GR Racing</h2>
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p className="text-gray-300 text-lg">Initializing telemetry systems...</p>
          {retryCountRef.current > 1 && (
            <p className="text-sm text-gray-400 mt-2">Attempt {retryCountRef.current} of 2</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Telemetry Center</h1>
            <p className="text-gray-300 text-lg">
              Real-time vehicle performance and sensor data
            </p>
          </div>

          <div className="text-right bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400">Race Engineer</div>
            <div className="font-semibold text-white text-lg">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {user?.role?.toLowerCase().replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status Bar */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Live Data</span>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isWebSocketConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-sm ${isWebSocketConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isWebSocketConnected ? 'STREAMING' : 'OFFLINE'}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {lastUpdate ? `Last: ${new Date(lastUpdate).toLocaleTimeString()}` : 'Awaiting data'}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-gray-300">Data Points</div>
          <div className="text-2xl font-bold text-white mt-1">
            {telemetryData.length + liveTelemetry.length}
          </div>
          <div className="text-xs text-gray-500">
            {liveTelemetry.length} live, {telemetryData.length} historical
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-gray-300">Selected Vehicle</div>
          <div className="text-xl font-bold text-white mt-1">
            {selectedVehicle ? `#${selectedVehicle.number}` : 'None'}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {selectedVehicle?.driver || 'Select vehicle'}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-gray-300">Session Progress</div>
          <div className="text-xl font-bold text-white mt-1">
            {currentTelemetry?.lap_number || 0} Laps
          </div>
          <div className="text-xs text-gray-500">
            Best: {bestLapTime ? bestLapTime.toFixed(3) + 's' : '--'}
          </div>
        </div>
      </div>

      {/* Vehicle Selection */}
      <div className="mb-8">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="font-semibold text-white text-lg mb-4">Vehicle Selection</h3>
          <div className="flex flex-wrap gap-3">
            {vehicles.map((vehicle) => (
              <button
                key={vehicle.id}
                onClick={() => handleVehicleSelect(vehicle.number)}
                className={`px-6 py-3 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                  selectedVehicle?.id === vehicle.id
                    ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/25'
                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="font-bold text-lg">#{vehicle.number}</div>
                <div className="text-sm opacity-80">{vehicle.driver}</div>
              </button>
            ))}
            <button
              onClick={handleSimulateData}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl border-2 border-green-500 hover:from-green-500 hover:to-green-600 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-500/25"
            >
              <div className="font-bold">Generate</div>
              <div className="text-sm opacity-80">Test Data</div>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-800 rounded-xl p-1 border border-gray-700 w-fit">
          {[
            { id: 'live', label: 'Live Data', icon: '⚡' },
            { id: 'historical', label: 'History', icon: '📊' },
            { id: 'analysis', label: 'Analysis', icon: '🔍' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-300 ${
                selectedTab === tab.id
                  ? 'bg-red-600 text-white shadow-lg shadow-red-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* Live Data Tab */}
        {selectedTab === 'live' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Primary Metrics */}
            <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Speed and RPM */}
              <div className="bg-gradient-to-br from-red-900 to-red-800 rounded-2xl p-6 border border-red-700 shadow-2xl">
                <h3 className="text-white text-lg font-semibold mb-4">Performance</h3>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-gray-300 text-sm">Speed</div>
                    <div className="text-5xl font-bold text-white mt-2">
                      {Math.round(currentLiveData?.speed || currentTelemetry?.speed || 0)}
                      <span className="text-2xl text-gray-300 ml-2">km/h</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-red-800 rounded-xl">
                      <div className="text-gray-300 text-xs">RPM</div>
                      <div className="text-xl font-bold text-white">
                        {(currentTelemetry?.rpm || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-red-800 rounded-xl">
                      <div className="text-gray-300 text-xs">Gear</div>
                      <div className="text-xl font-bold text-white">
                        {currentTelemetry?.gear || 'N'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Driver Inputs */}
              <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl p-6 border border-blue-700 shadow-2xl">
                <h3 className="text-white text-lg font-semibold mb-4">Driver Inputs</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-gray-300 text-sm mb-2">
                      <span>Throttle</span>
                      <span>{Math.round((currentTelemetry?.throttle || 0) * 100)}%</span>
                    </div>
                    <div className="w-full bg-blue-800 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${(currentTelemetry?.throttle || 0) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-gray-300 text-sm mb-2">
                      <span>Brake</span>
                      <span>{Math.round((currentTelemetry?.brake || 0) * 100)}%</span>
                    </div>
                    <div className="w-full bg-blue-800 rounded-full h-3">
                      <div
                        className="bg-red-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${(currentTelemetry?.brake || 0) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Position and Timing */}
              <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-2xl p-6 border border-purple-700 shadow-2xl">
                <h3 className="text-white text-lg font-semibold mb-4">Race Position</h3>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white">
                      P{currentLiveData?.position || currentTelemetry?.position || '--'}
                    </div>
                    <div className="text-gray-300 text-sm mt-2">Current Position</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-purple-800 rounded-xl">
                      <div className="text-gray-300 text-xs">Gap to Leader</div>
                      <div className="text-lg font-bold text-white">
                        {currentLiveData?.gap_to_leader ? `${currentLiveData.gap_to_leader.toFixed(2)}s` : '--'}
                      </div>
                    </div>
                    <div className="p-3 bg-purple-800 rounded-xl">
                      <div className="text-gray-300 text-xs">Current Lap</div>
                      <div className="text-lg font-bold text-white">
                        {currentLiveData?.lap_number || currentTelemetry?.lap_number || '--'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lap Performance */}
              <div className="bg-gradient-to-br from-orange-900 to-orange-800 rounded-2xl p-6 border border-orange-700 shadow-2xl">
                <h3 className="text-white text-lg font-semibold mb-4">Lap Performance</h3>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-gray-300 text-sm">Current Lap</div>
                    <div className="text-3xl font-bold text-white mt-2 font-mono">
                      {currentTelemetry?.lap_time_seconds ? `${currentTelemetry.lap_time_seconds.toFixed(3)}s` : '--:--.---'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-orange-800 rounded-xl">
                      <div className="text-gray-300 text-xs">Best Lap</div>
                      <div className="text-lg font-bold text-white font-mono">
                        {bestLapTime ? bestLapTime.toFixed(3) + 's' : '--'}
                      </div>
                    </div>
                    <div className="p-3 bg-orange-800 rounded-xl">
                      <div className="text-gray-300 text-xs">Average</div>
                      <div className="text-lg font-bold text-white font-mono">
                        {averageLapTime ? averageLapTime.toFixed(3) + 's' : '--'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Weather Panel */}
            <div className="bg-gradient-to-br from-cyan-900 to-cyan-800 rounded-2xl p-6 border border-cyan-700 shadow-2xl">
              <h3 className="text-white text-lg font-semibold mb-4">Weather Conditions</h3>
              {weatherData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-cyan-800 rounded-xl">
                      <div className="text-3xl font-bold text-white">
                        {Math.round(weatherData.track_temperature)}°
                      </div>
                      <div className="text-cyan-200 text-sm">Track Temp</div>
                    </div>
                    <div className="text-center p-4 bg-cyan-800 rounded-xl">
                      <div className="text-3xl font-bold text-white">
                        {Math.round(weatherData.air_temperature)}°
                      </div>
                      <div className="text-cyan-200 text-sm">Air Temp</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-cyan-800 rounded-lg">
                      <span className="text-cyan-200">Humidity</span>
                      <span className="text-white font-semibold">{weatherData.humidity}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-cyan-800 rounded-lg">
                      <span className="text-cyan-200">Pressure</span>
                      <span className="text-white font-semibold">{weatherData.pressure} hPa</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-cyan-800 rounded-lg">
                      <span className="text-cyan-200">Wind Speed</span>
                      <span className="text-white font-semibold">{weatherData.wind_speed} km/h</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-cyan-200">
                  <div className="text-4xl mb-2">🌤️</div>
                  <p>No weather data available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Historical Data Tab */}
        {selectedTab === 'historical' && (
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl">
            <h3 className="text-white text-lg font-semibold mb-4">Telemetry History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Lap</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Speed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">RPM</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Gear</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Throttle</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Brake</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Lap Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Position</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {telemetryData.slice(0, 15).map((data, index) => (
                    <tr key={index} className="hover:bg-gray-750 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-white">{data.lap_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{Math.round(data.speed)} km/h</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{data.rpm.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{data.gear}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{Math.round(data.throttle * 100)}%</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{Math.round(data.brake * 100)}%</td>
                      <td className="px-4 py-3 text-sm font-mono text-green-400">{data.lap_time_seconds.toFixed(3)}s</td>
                      <td className="px-4 py-3 text-sm text-gray-300">P{data.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {telemetryData.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-lg">No historical telemetry data available</p>
                  <p className="text-sm mt-2">Select a vehicle or generate test data</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analysis Tab */}
        {selectedTab === 'analysis' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl">
              <h3 className="text-white text-lg font-semibold mb-4">Performance Trends</h3>
              <div className="space-y-4">
                <div className="text-center p-6 bg-gray-750 rounded-xl">
                  <div className="text-gray-300 text-sm">Lap Time Consistency</div>
                  <div className="text-2xl font-bold text-white mt-2">
                    {telemetryData.length > 1 ? 
                      (Math.max(...telemetryData.map(t => t.lap_time_seconds)) - 
                       Math.min(...telemetryData.map(t => t.lap_time_seconds))).toFixed(3) + 's' 
                      : '--'
                    }
                  </div>
                  <div className="text-xs text-gray-400 mt-2">Variation across laps</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-750 rounded-xl">
                    <div className="text-gray-300 text-xs">Fastest Lap</div>
                    <div className="text-lg font-bold text-green-400 font-mono">
                      {bestLapTime ? bestLapTime.toFixed(3) + 's' : '--'}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-750 rounded-xl">
                    <div className="text-gray-300 text-xs">Average Speed</div>
                    <div className="text-lg font-bold text-blue-400">
                      {telemetryData.length > 0 ? 
                        Math.round(telemetryData.reduce((sum, t) => sum + t.speed, 0) / telemetryData.length) + ' km/h' 
                        : '--'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl">
              <h3 className="text-white text-lg font-semibold mb-4">Data Quality</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-750 rounded-xl">
                  <span className="text-gray-300">Data Points</span>
                  <span className="text-white font-semibold">{telemetryData.length}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-750 rounded-xl">
                  <span className="text-gray-300">Session Duration</span>
                  <span className="text-white font-semibold">
                    {telemetryData.length > 0 ? 
                      `${Math.round(telemetryData[0].lap_number * averageLapTime / 60)} min` 
                      : '--'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-750 rounded-xl">
                  <span className="text-gray-300">Update Frequency</span>
                  <span className="text-white font-semibold">
                    {isWebSocketConnected ? 'Real-time' : 'Polling'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

