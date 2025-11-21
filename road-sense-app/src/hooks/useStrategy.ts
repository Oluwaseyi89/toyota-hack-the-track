import { useState, useEffect } from 'react'
import { StrategyData } from '@/types/strategy'

export function useStrategy() {
  const [strategy, setStrategy] = useState<StrategyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStrategy = async () => {
      try {
        const response = await fetch('/api/strategy?lap=12') // Mock lap number
        if (!response.ok) throw new Error('Failed to fetch strategy')
        const data = await response.json()
        setStrategy(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStrategy()
    
    // Set up polling every 10 seconds
    const interval = setInterval(fetchStrategy, 10000)
    return () => clearInterval(interval)
  }, [])

  return { strategy, isLoading, error }
}