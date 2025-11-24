'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTelemetryData, useStrategyData, useRootStore } from '@/store';

interface TireWearGaugeProps {
  health?: {
    status: 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    lapsRemaining: number;
  };
  strategy?: any; // TireStrategy type
}

export default function TireWearGauge({ health, strategy }: TireWearGaugeProps) {
  const { 
    telemetryData,
    selectedVehicle 
  } = useTelemetryData();

  const {
    tireStrategies,
    getTireHealth 
  } = useRootStore();

  // Use provided props or fall back to store data
  const displayHealth = health || getTireHealth();
  const displayStrategy = strategy || tireStrategies[0];
  
  // Get latest telemetry data
  const latestTelemetry = telemetryData[0];
  const tireData = latestTelemetry?.tire_data;

  if (!tireData && !displayStrategy) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Tire Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <div className="w-12 h-12 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-3">
              <span className="text-gray-400 text-lg">🛞</span>
            </div>
            <p className="text-sm">No tire data available</p>
            <p className="text-xs text-gray-400 mt-1">Waiting for telemetry data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate wear percentage from temperature (simplified - in real app this would come from ML model)
  const calculateWearFromTemp = (temp: number | null) => {
    if (!temp) return 75; // Default if no temperature data
    
    // Simplified wear calculation based on temperature
    // Optimal temp range: 80-100°C, outside this range increases wear
    const optimalMin = 80;
    const optimalMax = 100;
    
    if (temp >= optimalMin && temp <= optimalMax) {
      return 85 - Math.random() * 10; // 75-85% in optimal range
    } else if (temp < optimalMin) {
      return 70 - (optimalMin - temp) * 0.5; // Lower temp = more wear
    } else {
      return 70 - (temp - optimalMax) * 0.3; // Higher temp = more wear
    }
  };

  // Tire positions with actual data or fallbacks
  const tirePositions = [
    { 
      name: 'Front Left', 
      temp: tireData?.front_left_temp,
      pressure: tireData?.front_left_pressure,
      wear: calculateWearFromTemp(tireData?.front_left_temp as any)
    },
    { 
      name: 'Front Right', 
      temp: tireData?.front_right_temp,
      pressure: tireData?.front_right_pressure,
      wear: calculateWearFromTemp(tireData?.front_right_temp as any)
    },
    { 
      name: 'Rear Left', 
      temp: tireData?.rear_left_temp,
      pressure: tireData?.rear_left_pressure,
      wear: calculateWearFromTemp(tireData?.rear_left_temp as any)
    },
    { 
      name: 'Rear Right', 
      temp: tireData?.rear_right_temp,
      pressure: tireData?.rear_right_pressure,
      wear: calculateWearFromTemp(tireData?.rear_right_temp as any)
    },
  ];

  const getWearColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-yellow-500';
    if (value >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getWearStatus = (value: number) => {
    if (value >= 80) return 'Optimal';
    if (value >= 60) return 'Good';
    if (value >= 40) return 'Monitor';
    return 'Critical';
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'GOOD': return 'text-green-600';
      case 'FAIR': return 'text-yellow-600';
      case 'POOR': return 'text-orange-600';
      case 'CRITICAL': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthBgColor = (status: string) => {
    switch (status) {
      case 'GOOD': return 'bg-green-50 border-green-200';
      case 'FAIR': return 'bg-yellow-50 border-yellow-200';
      case 'POOR': return 'bg-orange-50 border-orange-200';
      case 'CRITICAL': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const averageWear = tirePositions.reduce((sum, tire) => sum + tire.wear, 0) / tirePositions.length;

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
          <span>Tire Analysis</span>
          {selectedVehicle && (
            <span className="text-sm text-gray-500">#{selectedVehicle.number}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tire Wear Progress Bars */}
        <div className="space-y-4">
          {tirePositions.map((tire, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{tire.name}</span>
                <div className="flex items-center space-x-3">
                  {tire.temp && (
                    <span className="text-xs text-gray-500">
                      {tire.temp.toFixed(0)}°C
                    </span>
                  )}
                  <span className="text-sm font-mono font-semibold text-gray-900 w-8">
                    {tire.wear.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getWearColor(tire.wear)} transition-all duration-300`}
                  style={{ width: `${tire.wear}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Health Summary */}
        <div className="mt-6 space-y-3">
          <div className={`p-3 rounded-lg border ${getHealthBgColor(displayHealth?.status || 'GOOD')}`}>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-gray-700">Overall Health</div>
                <div className={`text-sm font-semibold ${getHealthColor(displayHealth?.status || 'GOOD')}`}>
                  {displayHealth?.status || 'GOOD'}
                </div>
              </div>
              {displayHealth && (
                <div className="text-right">
                  <div className="text-xs text-gray-600">Laps Remaining</div>
                  <div className="text-sm font-bold text-gray-900">
                    {displayHealth.lapsRemaining}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Strategy Information */}
          {displayStrategy && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-1">Strategy Insight</div>
              <div className="text-xs text-blue-700 space-y-1">
                <div className="flex justify-between">
                  <span>Optimal Change:</span>
                  <span className="font-medium">
                    Lap {displayStrategy.optimal_change_lap}
                  </span>
                </div>
                {displayStrategy.confidence && (
                  <div className="flex justify-between">
                    <span>Confidence:</span>
                    <span className="font-medium">
                      {(displayStrategy.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Simple Stats */}
          <div className="text-center p-2 bg-gray-50 rounded border">
            <div className="text-xs text-gray-600">Average Wear</div>
            <div className="font-bold text-gray-900 text-sm">
              {averageWear.toFixed(1)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

