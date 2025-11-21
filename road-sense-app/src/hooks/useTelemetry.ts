import { useState, useEffect } from 'react'
import { TelemetryData } from '@/types/telemetry'

export function useTelemetry() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const response = await fetch('/api/telemetry')
        if (!response.ok) throw new Error('Failed to fetch telemetry')
        const data = await response.json()
        setTelemetry(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTelemetry()
    
    // Set up polling every 5 seconds
    const interval = setInterval(fetchTelemetry, 5000)
    return () => clearInterval(interval)
  }, [])

  return { telemetry, isLoading, error }
}