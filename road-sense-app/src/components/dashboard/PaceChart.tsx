'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StrategyData } from '@/types/strategy'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface PaceChartProps {
  strategy: StrategyData | null
}

export default function PaceChart({ strategy }: PaceChartProps) {
  // Mock pace data - in real app, this would come from your backend
  const mockPaceData = {
    labels: Array.from({ length: 30 }, (_, i) => `Lap ${i + 1}`),
    datasets: [
      {
        label: 'Actual Lap Times',
        data: Array.from({ length: 30 }, () => 85 + Math.random() * 5),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Optimal Pace',
        data: Array.from({ length: 30 }, () => 84 + Math.random() * 2),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderDash: [5, 5],
        tension: 0.4,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'white',
        },
      },
      title: {
        display: true,
        text: 'Lap Time Progression',
        color: 'white',
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
          callback: function(value: any) {
            return value + 's';
          },
        },
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pace Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Line data={mockPaceData} options={options} />
        {strategy && (
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-2 bg-gray-700 rounded">
              <div className="text-gray-300">Tire Life</div>
              <div className="font-semibold">
                {strategy.tireDegradation.predictedLapsRemaining} laps
              </div>
            </div>
            <div className="text-center p-2 bg-gray-700 rounded">
              <div className="text-gray-300">Fuel Use</div>
              <div className="font-semibold">
                {strategy.fuelStrategy.consumptionPerLap.toFixed(1)} L/lap
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}