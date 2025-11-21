import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TireWearGaugeProps {
  wear: number[] | undefined // [FL, FR, RL, RR]
}

export default function TireWearGauge({ wear }: TireWearGaugeProps) {
  if (!wear) return null

  const tirePositions = [
    { name: 'Front Left', value: wear[0] },
    { name: 'Front Right', value: wear[1] },
    { name: 'Rear Left', value: wear[2] },
    { name: 'Rear Right', value: wear[3] },
  ]

  const getWearColor = (value: number) => {
    if (value >= 80) return 'bg-green-500'
    if (value >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tire Wear</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tirePositions.map((tire, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{tire.name}</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getWearColor(tire.value)}`}
                    style={{ width: `${tire.value}%` }}
                  />
                </div>
                <span className="text-sm font-mono w-8">{tire.value}%</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-gray-700 rounded-lg">
          <div className="text-xs text-gray-300">Tire Health</div>
          <div className="text-sm font-semibold">
            {wear.reduce((a, b) => a + b, 0) / wear.length >= 80 ? 'Optimal' : 
             wear.reduce((a, b) => a + b, 0) / wear.length >= 60 ? 'Monitor' : 'Critical'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}