import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FuelIndicatorProps {
  fuelRemaining: number | undefined
  lapsRemaining: number | undefined
}

export default function FuelIndicator({ fuelRemaining, lapsRemaining }: FuelIndicatorProps) {
  if (fuelRemaining === undefined || lapsRemaining === undefined) return null

  const fuelPercentage = (fuelRemaining / 100) * 100 // Assuming 100L capacity

  const getFuelColor = (percentage: number) => {
    if (percentage > 30) return 'bg-green-500'
    if (percentage > 15) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fuel Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Fuel Remaining</span>
              <span className="font-mono">{fuelRemaining.toFixed(1)} L</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getFuelColor(fuelPercentage)} transition-all duration-300`}
                style={{ width: `${fuelPercentage}%` }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{lapsRemaining}</div>
              <div className="text-xs text-gray-300">Laps Remaining</div>
            </div>
            <div className="text-center p-3 bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">
                {(fuelRemaining / lapsRemaining).toFixed(1)}
              </div>
              <div className="text-xs text-gray-300">L/Lap</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}