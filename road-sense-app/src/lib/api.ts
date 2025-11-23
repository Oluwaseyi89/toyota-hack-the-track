// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// export async function fetchTelemetry(): Promise<any> {
//   const response = await fetch(`${API_BASE_URL}/api/telemetry/`)
//   if (!response.ok) throw new Error('Failed to fetch telemetry')
//   return response.json()
// }

// export async function fetchStrategy(lap: number): Promise<any> {
//   const response = await fetch(`${API_BASE_URL}/api/strategy/?lap=${lap}`)
//   if (!response.ok) throw new Error('Failed to fetch strategy')
//   return response.json()
// }

// export async function fetchAlerts(): Promise<any> {
//   const response = await fetch(`${API_BASE_URL}/api/alerts/`)
//   if (!response.ok) throw new Error('Failed to fetch alerts')
//   return response.json()
// }
















// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// // Helper for authenticated requests
// async function authFetch(url: string, options: RequestInit = {}) {
//   const response = await fetch(`${API_BASE_URL}${url}`, {
//     ...options,
//     credentials: 'include', // ← Sends session cookies
//     headers: {
//       'Content-Type': 'application/json',
//       ...options.headers,
//     },
//   })
  
//   if (!response.ok) {
//     throw new Error(`API Error: ${response.status} ${response.statusText}`)
//   }
  
//   return response.json()
// }

// // Authentication
// export async function login(username: string, password: string) {
//   return authFetch('/api/accounts/auth/login/', {
//     method: 'POST',
//     body: JSON.stringify({ username, password }),
//   })
// }

// export async function logout() {
//   return authFetch('/api/accounts/auth/logout/', {
//     method: 'POST',
//   })
// }

// export async function getCurrentUser() {
//   return authFetch('/api/accounts/auth/me/')
// }

// // Telemetry endpoints
// export async function fetchTelemetry(): Promise<any> {
//   return authFetch('/api/telemetry/data/current/')
// }

// export async function fetchVehicleTelemetry(vehicleNumber: number): Promise<any> {
//   return authFetch(`/api/telemetry/data/vehicle/?vehicle_number=${vehicleNumber}`)
// }

// // Strategy endpoints
// export async function fetchStrategy(): Promise<any> {
//   return authFetch('/api/strategy/predictions/comprehensive/')
// }

// export async function fetchPitStrategy(): Promise<any> {
//   return authFetch('/api/strategy/pit/current/')
// }

// // Alerts endpoints
// export async function fetchAlerts(): Promise<any> {
//   return authFetch('/api/alerts/alerts/active/')
// }

// export async function fetchAlertSummary(): Promise<any> {
//   return authFetch('/api/alerts/alerts/summary/')
// }

// // Analytics endpoints
// export async function fetchAnalyticsSummary(): Promise<any> {
//   return authFetch('/api/analytics/summary/dashboard/')
// }

// // Simulation endpoints
// export async function runSimulation(parameters: any): Promise<any> {
//   return authFetch('/api/analytics/simulations/simulate/', {
//     method: 'POST',
//     body: JSON.stringify({ parameters }),
//   })
// }






const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const NEXT_API_BASE = '/api' // Your Next.js API routes

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// Enhanced authFetch with better error handling
async function authFetch(url: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

// Use Next.js API routes that proxy to Django
export async function fetchAlerts(): Promise<any> {
  try {
    const response = await fetch(`${NEXT_API_BASE}/alerts`)
    if (!response.ok) throw new Error('Failed to fetch alerts')
    return response.json()
  } catch (error) {
    // Fallback to direct Django API if Next.js route fails
    return authFetch('/api/alerts/alerts/active/')
  }
}

export async function acknowledgeAlert(alertId: number): Promise<any> {
  const response = await fetch(`${NEXT_API_BASE}/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ alertId, action: 'acknowledge' })
  })
  
  if (!response.ok) {
    throw new Error('Failed to acknowledge alert')
  }
  
  return response.json()
}

// Keep other endpoints as they are...
export async function login(username: string, password: string) {
  return authFetch('/api/accounts/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function fetchTelemetry(): Promise<any> {
  return authFetch('/api/telemetry/data/current/')
}

export async function fetchStrategy(): Promise<any> {
  return authFetch('/api/strategy/predictions/comprehensive/')
}