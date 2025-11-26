'use client'

import { useSearchParams } from 'next/navigation'
import DashboardView from '@/components/dashboard/DashboardView'
import TelemetryView from '@/components/dashboard/TelemetryView'
import StrategyView from '@/components/dashboard/StrategyView'
import AnalysisView from '@/components/dashboard/AnalysisView'
import SettingsView from '@/components/dashboard/SettingsView'

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const view = searchParams.get('view')

  if (view === 'telemetry') {
    return <TelemetryView />
  } else if (view === 'strategy') {
    return <StrategyView/>
  } else if (view === 'analysis') {
    return <AnalysisView/>
  } else if (view === 'settings') {
    return <SettingsView/>
  }

  return <DashboardView />
}

export const dynamic = 'force-dynamic'

