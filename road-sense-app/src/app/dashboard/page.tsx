'use client'

import { useTelemetry } from '@/hooks/useTelemetry'
import { useStrategy } from '@/hooks/useStrategy'
import RealTimeMetrics from '@/components/dashboard/RealTimeMetrics'
import TireWearGauge from '@/components/dashboard/TireWearGauge'
import FuelIndicator from '@/components/dashboard/FuelIndicator'
import PaceChart from '@/components/dashboard/PaceChart'
import StrategyTimeline from '@/components/dashboard/StrategyTimeline'
import AlertsPanel from '@/components/dashboard/AlertsPanel'

export default function DashboardPage() {
  const { telemetry, isLoading: telemetryLoading } = useTelemetry()
  const { strategy, isLoading: strategyLoading } = useStrategy()

  if (telemetryLoading || strategyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl">Loading racing data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Row: Real-time Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RealTimeMetrics telemetry={telemetry} />
        </div>
        <div className="space-y-6">
          <TireWearGauge wear={telemetry?.tireWear} />
          <FuelIndicator 
            fuelRemaining={telemetry?.fuelRemaining}
            lapsRemaining={telemetry?.fuelLapsRemaining}
          />
        </div>
      </div>

      {/* Middle Row: Charts and Strategy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaceChart strategy={strategy} />
        <StrategyTimeline strategy={strategy} />
      </div>

      {/* Bottom Row: Alerts */}
      <div className="grid grid-cols-1 gap-6">
        <AlertsPanel />
      </div>
    </div>
  )
}