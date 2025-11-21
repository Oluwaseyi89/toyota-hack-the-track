const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function fetchTelemetry(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/telemetry/`)
  if (!response.ok) throw new Error('Failed to fetch telemetry')
  return response.json()
}

export async function fetchStrategy(lap: number): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/strategy/?lap=${lap}`)
  if (!response.ok) throw new Error('Failed to fetch strategy')
  return response.json()
}

export async function fetchAlerts(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/alerts/`)
  if (!response.ok) throw new Error('Failed to fetch alerts')
  return response.json()
}