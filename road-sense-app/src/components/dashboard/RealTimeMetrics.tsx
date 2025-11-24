'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/layout/MetricCard';
import { useTelemetryData } from '@/store';

interface RealTimeMetricsProps {
  telemetry?: any; // Use your TelemetryData type
  weather?: any;   // Use your WeatherData type
  vehicles?: any[]; // Use your LiveTelemetry type for multiple vehicles
}

export default function RealTimeMetrics({ telemetry, weather, vehicles }: RealTimeMetricsProps) {
  const { 
    liveTelemetry, 
    telemetryData, 
    weatherData,
    selectedVehicle 
  } = useTelemetryData();

  // Use provided telemetry or fall back to store data
  const currentTelemetry = telemetry || liveTelemetry[0] || telemetryData[0];
  const currentWeather = weather || weatherData;

  if (!currentTelemetry) {
    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Real-time Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-sm">No telemetry data available</p>
            <p className="text-xs text-gray-400 mt-1">Waiting for race data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate best lap time from historical data
  const bestLapTime = telemetryData.length > 0 
    ? Math.min(...telemetryData.map(t => t.lap_time_seconds))
    : currentTelemetry.lap_time_seconds;

  // Format lap time for display
  const formatLapTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return minutes > 0 ? `${minutes}:${remainingSeconds.padStart(6, '0')}` : `${remainingSeconds}s`;
  };

  // Get sector times if available
  const sectorTimes = [
    currentTelemetry.sector1_time,
    currentTelemetry.sector2_time, 
    currentTelemetry.sector3_time
  ].filter(Boolean);

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
          <span>Real-time Metrics</span>
          {selectedVehicle && (
            <span className="text-sm font-normal text-gray-500">
              #{selectedVehicle.number} • {selectedVehicle.driver}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Main Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Current Lap"
            value={currentTelemetry.lap_number?.toString() || '--'}
            subtitle="Lap"
            trend="neutral"
          />
          
          <MetricCard
            title="Lap Time"
            value={formatLapTime(currentTelemetry.lap_time_seconds)}
            subtitle={`Best: ${formatLapTime(bestLapTime)}`}
            trend="positive"
          />
          
          <MetricCard
            title="Position"
            value={`P${currentTelemetry.position || '--'}`}
            subtitle={`Gap: +${(currentTelemetry.gap_to_leader || 0).toFixed(2)}s`}
            trend="neutral"
          />
          
          <MetricCard
            title="Speed"
            value={`${Math.round(currentTelemetry.speed || 0)} km/h`}
            subtitle={`Gear: ${currentTelemetry.gear || 'N'}`}
            trend="positive"
          />
        </div>

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <MetricCard
            title="RPM"
            value={(currentTelemetry.rpm || 0).toLocaleString()}
            subtitle="Engine"
            size="sm"
          />
          
          <MetricCard
            title="Throttle"
            value={`${Math.round((currentTelemetry.throttle || 0) * 100)}%`}
            subtitle="Input"
            size="sm"
          />
          
          <MetricCard
            title="Brake"
            value={`${Math.round((currentTelemetry.brake || 0) * 100)}%`}
            subtitle="Pressure"
            size="sm"
          />

          <MetricCard
            title="Track Temp"
            value={`${Math.round(currentWeather?.track_temperature || 0)}°C`}
            subtitle={`Air: ${Math.round(currentWeather?.air_temperature || 0)}°C`}
            size="sm"
          />
        </div>

        {/* Sector Times */}
        {sectorTimes.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Sector Times</h4>
            <div className="grid grid-cols-3 gap-3">
              {sectorTimes.map((time, index) => (
                <div 
                  key={index} 
                  className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg"
                >
                  <div className="text-xs font-medium text-blue-700 mb-1">
                    Sector {index + 1}
                  </div>
                  <div className="font-mono text-sm font-bold text-blue-900">
                    {time ? formatLapTime(typeof time === 'string' ? parseFloat(time) : time) : '--:--.---'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vehicle Performance Summary */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="text-center p-2 bg-gray-50 rounded border">
            <div className="text-gray-600 font-medium">Fuel Remaining</div>
            <div className="font-bold text-gray-900">
              {currentTelemetry.fuel_remaining ? `${currentTelemetry.fuel_remaining}L` : '--'}
            </div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded border">
            <div className="text-gray-600 font-medium">Tire Wear</div>
            <div className="font-bold text-gray-900">
              {currentTelemetry.tire_wear ? `${Math.round(currentTelemetry.tire_wear * 100)}%` : '--'}
            </div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded border">
            <div className="text-gray-600 font-medium">Laps Completed</div>
            <div className="font-bold text-gray-900">
              {currentTelemetry.lap_number || '0'}
            </div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded border">
            <div className="text-gray-600 font-medium">Race Progress</div>
            <div className="font-bold text-gray-900">
              {currentTelemetry.race_progress ? `${Math.round(currentTelemetry.race_progress * 100)}%` : '--'}
            </div>
          </div>
        </div>

        {/* Multiple Vehicles Overview (if available) */}
        {vehicles && vehicles.length > 1 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Team Overview</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vehicles.slice(0, 4).map((vehicle, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">
                      #{vehicle.vehicle_id}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    P{vehicle.position} • +{vehicle.gap_to_leader?.toFixed(2)}s
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
