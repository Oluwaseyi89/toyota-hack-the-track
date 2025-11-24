'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStrategyData, useRootStore } from '@/store';

interface StrategyTimelineProps {
  pitStrategies?: any[]; // Use your PitStrategy type
  currentPrediction?: any; // Use your StrategyPrediction type
  pitWindow?: {
    startLap: number;
    endLap: number;
    confidence: number;
  } | null;
}

export default function StrategyTimeline({ 
  pitStrategies, 
  currentPrediction, 
  pitWindow 
}: StrategyTimelineProps) {
  const {
    pitStrategies: storePitStrategies,
    tireStrategies,
    currentPrediction: storeCurrentPrediction,
    getOptimalPitWindow,
    getTireHealth
  } = useRootStore();

  // Use provided props or fall back to store data
  const displayPitStrategies = pitStrategies || storePitStrategies;
  const displayCurrentPrediction = currentPrediction || storeCurrentPrediction;
  const displayPitWindow = pitWindow || getOptimalPitWindow();
  const tireHealth = getTireHealth();

  // Get current strategies
  const currentPitStrategy = displayPitStrategies[0];
  const currentTireStrategy = tireStrategies[0];
  const currentFuelStrategy = displayCurrentPrediction?.fuel_strategy;

  if (!currentPitStrategy && !currentTireStrategy && !displayCurrentPrediction) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Race Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">No strategy data available</p>
            <p className="text-xs text-gray-400 mt-1">Waiting for strategy analysis...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get strategy type display name
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

  // Get strategy type color
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

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Race Strategy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Strategy Recommendation */}
          {currentPitStrategy && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Current Strategy</h4>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
                <div>
                  <div className="font-semibold text-blue-900 text-lg">
                    {getStrategyTypeDisplay(currentPitStrategy.strategy_type)}
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    {currentPitStrategy.reasoning || 'ML model recommendation based on current race conditions'}
                  </div>
                </div>
                <Badge className={getStrategyTypeColor(currentPitStrategy.strategy_type)}>
                  Active
                </Badge>
              </div>
            </div>
          )}

          {/* Optimal Pit Window */}
          {displayPitWindow && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Optimal Pit Window</h4>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg">
                <div>
                  <div className="font-semibold text-green-900 text-lg">
                    Laps {displayPitWindow.startLap} - {displayPitWindow.endLap}
                  </div>
                  <div className="text-sm text-green-700 mt-1">
                    Confidence: {(displayPitWindow.confidence * 100).toFixed(0)}%
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Recommended
                </Badge>
              </div>
            </div>
          )}

          {/* Tire Strategy */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Tire Status</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
                <div className="text-xs text-blue-700 font-medium">Health Status</div>
                <div className={`font-semibold text-lg ${
                  tireHealth.status === 'GOOD' ? 'text-green-600' :
                  tireHealth.status === 'FAIR' ? 'text-yellow-600' :
                  tireHealth.status === 'POOR' ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {tireHealth.status}
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg">
                <div className="text-xs text-orange-700 font-medium">Laps Remaining</div>
                <div className="font-semibold text-orange-900 text-lg">
                  {tireHealth.lapsRemaining}
                </div>
              </div>
            </div>
            {currentTireStrategy && (
              <div className="mt-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Degradation Rate:</span>
                  <span className="font-medium">
                    {(currentTireStrategy.degradation_rate * 100).toFixed(1)}% per lap
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Optimal Change Lap:</span>
                  <span className="font-medium">
                    Lap {currentTireStrategy.optimal_change_lap}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Confidence:</span>
                  <span className="font-medium">
                    {(currentTireStrategy.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Fuel Strategy */}
          {currentFuelStrategy && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Fuel Strategy</h4>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-purple-700 font-medium">Current Fuel</div>
                    <div className="font-semibold text-purple-900 text-lg">
                      {currentFuelStrategy.current_fuel}L
                    </div>
                  </div>
                  <div>
                    <div className="text-purple-700 font-medium">Laps Remaining</div>
                    <div className="font-semibold text-purple-900 text-lg">
                      {currentFuelStrategy.predicted_laps_remaining}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Consumption Rate:</span>
                    <span className="font-medium">
                      {currentFuelStrategy.consumption_rate.toFixed(2)} L/lap
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fuel Saving:</span>
                    <span className="font-medium">
                      {currentFuelStrategy.need_to_conserve ? 'Required' : 'Not Required'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alternative Strategies */}
          {displayPitStrategies.length > 1 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Alternative Strategies</h4>
              <div className="space-y-2">
                {displayPitStrategies.slice(1, 4).map((strategy, index) => (
                  <div key={strategy.id} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">
                        {getStrategyTypeDisplay(strategy.strategy_type)}
                      </span>
                      <div className="text-xs text-gray-500">
                        Lap {strategy.recommended_lap} • {(strategy.confidence * 100).toFixed(0)}% confidence
                      </div>
                    </div>
                    <Badge variant="outline" className="text-gray-600">
                      Backup
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

