import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TelemetryData } from '@/types/telemetry'
import { MetricCard } from '@/components/layout/MetricCard'

interface RealTimeMetricsProps {
  telemetry: TelemetryData | null
}

export default function RealTimeMetrics({ telemetry }: RealTimeMetricsProps) {
  if (!telemetry) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Current Lap"
            value={telemetry.currentLap.toString()}
            subtitle="Lap"
          />
          <MetricCard
            title="Lap Time"
            value={telemetry.lapTime}
            subtitle={telemetry.bestLap && `Best: ${telemetry.bestLap}`}
          />
          <MetricCard
            title="Position"
            value={`P${telemetry.position}`}
            subtitle={`Gap: +${telemetry.gapToLeader}s`}
          />
          <MetricCard
            title="Track Temp"
            value={`${telemetry.trackTemp}°C`}
            subtitle={`Air: ${telemetry.airTemp}°C`}
          />
        </div>
        
        {/* Sector Times */}
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">Sector Times</h4>
          <div className="grid grid-cols-3 gap-2">
            {telemetry.sectorTimes.map((time, index) => (
              <div key={index} className="text-center p-2 bg-gray-700 rounded">
                <div className="text-xs text-gray-400">S{index + 1}</div>
                <div className="font-mono text-sm">{time}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}