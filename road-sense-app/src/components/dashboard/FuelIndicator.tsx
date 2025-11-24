'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStrategyData } from '@/store';

interface FuelIndicatorProps {
  strategies?: any; // FuelStrategy type
}

export default function FuelIndicator({ strategies }: FuelIndicatorProps) {
  const {
    currentPrediction
  } = useStrategyData();

  // Use provided strategies or fall back to store data
  const fuelStrategy = strategies || currentPrediction?.fuel_strategy;

  if (!fuelStrategy) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Fuel Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <div className="w-12 h-12 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-3">
              <span className="text-gray-400 text-lg">⛽</span>
            </div>
            <p className="text-sm">No fuel data available</p>
            <p className="text-xs text-gray-400 mt-1">Waiting for strategy analysis...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    current_fuel,
    predicted_laps_remaining,
    consumption_rate,
    need_to_conserve
  } = fuelStrategy;

  // Assuming 100L capacity for percentage calculation
  const fuelPercentage = (current_fuel / 100) * 100;

  const getFuelColor = (percentage: number) => {
    if (percentage > 40) return 'bg-green-500';
    if (percentage > 20) return 'bg-yellow-500';
    if (percentage > 10) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getFuelStatus = (percentage: number, needToConserve: boolean) => {
    if (needToConserve) return 'Conserve Fuel';
    if (percentage > 40) return 'Optimal';
    if (percentage > 20) return 'Monitor';
    if (percentage > 10) return 'Low';
    return 'Critical';
  };

  const getStatusColor = (percentage: number, needToConserve: boolean) => {
    if (needToConserve) return 'text-yellow-600';
    if (percentage > 40) return 'text-green-600';
    if (percentage > 20) return 'text-yellow-600';
    if (percentage > 10) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStatusBgColor = (percentage: number, needToConserve: boolean) => {
    if (needToConserve) return 'bg-yellow-50 border-yellow-200';
    if (percentage > 40) return 'bg-green-50 border-green-200';
    if (percentage > 20) return 'bg-yellow-50 border-yellow-200';
    if (percentage > 10) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Fuel Strategy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Fuel Level Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">Fuel Remaining</span>
              <span className="font-mono font-semibold text-gray-900">
                {current_fuel.toFixed(1)} L
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getFuelColor(fuelPercentage)} transition-all duration-300`}
                style={{ width: `${fuelPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0L</span>
              <span>50L</span>
              <span>100L</span>
            </div>
          </div>

          {/* Fuel Status */}
          <div className={`p-3 rounded-lg border ${getStatusBgColor(fuelPercentage, need_to_conserve)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">Status</div>
                <div className={`text-sm font-semibold ${getStatusColor(fuelPercentage, need_to_conserve)}`}>
                  {getFuelStatus(fuelPercentage, need_to_conserve)}
                </div>
              </div>
              {need_to_conserve && (
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">⚠️</span>
                </div>
              )}
            </div>
          </div>

          {/* Fuel Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg">
              <div className="text-xl font-bold text-green-900">{predicted_laps_remaining}</div>
              <div className="text-xs text-green-700 font-medium">Laps Remaining</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
              <div className="text-xl font-bold text-blue-900">
                {consumption_rate.toFixed(2)}
              </div>
              <div className="text-xs text-blue-700 font-medium">L/Lap</div>
            </div>
          </div>

          {/* Additional Fuel Information */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Fuel per Lap:</span>
              <span className="font-medium text-gray-900">
                {consumption_rate.toFixed(2)} L
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Range:</span>
              <span className="font-medium text-gray-900">
                {(current_fuel / consumption_rate).toFixed(1)} laps
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Safety Margin:</span>
              <span className="font-medium text-gray-900">
                {Math.max(0, (current_fuel / consumption_rate) - predicted_laps_remaining).toFixed(1)} laps
              </span>
            </div>
          </div>

          {/* Fuel Conservation Warning */}
          {need_to_conserve && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs">!</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-yellow-800">Fuel Conservation Required</div>
                  <div className="text-xs text-yellow-700 mt-1">
                    Reduce consumption to complete the race. Consider lift-and-coast and reduced engine modes.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
