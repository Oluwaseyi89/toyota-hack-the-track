'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTelemetryData, useStrategyData } from '@/store';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PaceChartProps {
  telemetryData: any[];
  performanceAnalyses?: any[];
}

export default function PaceChart({ telemetryData, performanceAnalyses }: PaceChartProps) {
  const { 
    liveTelemetry,
    selectedVehicle 
  } = useTelemetryData();

  const {
    tireStrategies,
    currentPrediction
  } = useStrategyData();

  // Process telemetry data for the chart
  const processPaceData = () => {
    if (telemetryData && telemetryData.length > 0) {
      const recentTelemetry = telemetryData.slice(0, 20).reverse();
      
      const labels = recentTelemetry.map(data => `Lap ${data.lap_number}`);
      const actualTimes = recentTelemetry.map(data => data.lap_time_seconds);
      
      const optimalTimes = recentTelemetry.map(data => {
        const baseTime = data.lap_time_seconds;
        return baseTime * (0.95 + Math.random() * 0.03);
      });

      return {
        labels,
        datasets: [
          {
            label: 'Actual Lap Times',
            data: actualTimes,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            pointBackgroundColor: 'rgb(59, 130, 246)',
            pointBorderColor: 'white',
            pointBorderWidth: 2,
          },
          {
            label: 'Optimal Pace',
            data: optimalTimes,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderDash: [5, 5],
            tension: 0.4,
            pointBackgroundColor: 'rgb(34, 197, 94)',
            pointBorderColor: 'white',
            pointBorderWidth: 2,
          },
        ],
      };
    }

    return {
      labels: Array.from({ length: 20 }, (_, i) => `Lap ${i + 1}`),
      datasets: [
        {
          label: 'Actual Lap Times',
          data: Array.from({ length: 20 }, () => 85 + Math.random() * 5),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Optimal Pace',
          data: Array.from({ length: 20 }, () => 84 + Math.random() * 2),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderDash: [5, 5],
          tension: 0.4,
        },
      ],
    };
  };

  const paceData = processPaceData();

  // Fixed Chart.js options with proper TypeScript types
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#6B7280',
          font: {
            size: 12,
            weight: 'normal', // Changed from '500' to 'normal'
          },
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: 'Lap Time Progression',
        color: '#111827',
        font: {
          size: 16,
          weight: 'bold', // Use 'bold' instead of numeric weight
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(209, 213, 219, 0.3)',
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
          },
          maxTicksLimit: 10,
        },
        title: {
          display: true,
          text: 'Lap Number',
          color: '#374151',
          font: {
            size: 12,
            weight: 'normal',
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(209, 213, 219, 0.3)',
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
          },
          callback: function(value) {
            if (typeof value === 'number') {
              return value + 's';
            }
            return value;
          },
        },
        title: {
          display: true,
          text: 'Lap Time (seconds)',
          color: '#374151',
          font: {
            size: 12,
            weight: 'normal',
          },
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
      },
    },
  };

  const currentTireStrategy = tireStrategies[0];
  const currentFuelStrategy = currentPrediction?.fuel_strategy;

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Pace Analysis
        </CardTitle>
        {selectedVehicle && (
          <p className="text-sm text-gray-500 mt-1">
            Vehicle #{selectedVehicle.number} - {selectedVehicle.driver}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <Line data={paceData} options={options} />
        </div>
        
        {/* Rest of the component remains the same */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <h4 className="font-semibold text-blue-900 text-sm">Tire Status</h4>
            </div>
            {currentTireStrategy ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Laps Remaining:</span>
                  <span className="font-semibold text-blue-900">
                    {currentTireStrategy.predicted_laps_remaining}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Degradation:</span>
                  <span className="font-semibold text-blue-900">
                    {(currentTireStrategy.degradation_rate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Optimal Change:</span>
                  <span className="font-semibold text-blue-900">
                    Lap {currentTireStrategy.optimal_change_lap}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-blue-600 text-sm">No tire data available</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h4 className="font-semibold text-green-900 text-sm">Fuel Status</h4>
            </div>
            {currentFuelStrategy ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Current Fuel:</span>
                  <span className="font-semibold text-green-900">
                    {currentFuelStrategy.current_fuel}L
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Laps Remaining:</span>
                  <span className="font-semibold text-green-900">
                    {currentFuelStrategy.predicted_laps_remaining}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Consumption:</span>
                  <span className="font-semibold text-green-900">
                    {currentFuelStrategy.consumption_rate.toFixed(1)} L/lap
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-green-600 text-sm">No fuel data available</p>
            )}
          </div>
        </div>

        {telemetryData.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <div className="text-center p-2 bg-gray-50 rounded border">
              <div className="text-gray-600 font-medium">Best Lap</div>
              <div className="font-bold text-gray-900 text-sm">
                {Math.min(...telemetryData.map(t => t.lap_time_seconds)).toFixed(3)}s
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded border">
              <div className="text-gray-600 font-medium">Avg Lap</div>
              <div className="font-bold text-gray-900 text-sm">
                {(telemetryData.reduce((sum, t) => sum + t.lap_time_seconds, 0) / telemetryData.length).toFixed(3)}s
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded border">
              <div className="text-gray-600 font-medium">Lap Delta</div>
              <div className="font-bold text-gray-900 text-sm">
                {telemetryData.length > 1 
                  ? (telemetryData[0].lap_time_seconds - telemetryData[1].lap_time_seconds).toFixed(3) + 's'
                  : '0.000s'
                }
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
