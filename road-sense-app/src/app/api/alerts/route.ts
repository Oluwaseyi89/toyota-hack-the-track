// import { NextRequest, NextResponse } from 'next/server'

// export async function GET(request: NextRequest) {
//   try {
//     // Mock alerts from your prediction models
//     const alerts = [
//       {
//         id: 1,
//         type: 'tire_wear' as const,
//         severity: 'high' as const,
//         message: 'Front left tire degradation exceeding threshold',
//         timestamp: new Date().toISOString(),
//         recommendedAction: 'Consider pit stop within 3 laps'
//       },
//       {
//         id: 2,
//         type: 'fuel' as const,
//         severity: 'medium' as const,
//         message: 'Fuel consumption 5% higher than predicted',
//         timestamp: new Date().toISOString(),
//         recommendedAction: 'Review fuel saving opportunities'
//       },
//       {
//         id: 3,
//         type: 'weather' as const,
//         severity: 'low' as const,
//         message: 'Light rain expected in 10 laps',
//         timestamp: new Date().toISOString(),
//         recommendedAction: 'Monitor track conditions'
//       }
//     ]

//     return NextResponse.json(alerts)
//   } catch (error) {
//     return NextResponse.json(
//       { error: 'Failed to fetch alerts' },
//       { status: 500 }
//     )
//   }
// }









import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.BACKEND_API_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    // Forward request to your Django backend
    const response = await fetch(`${API_BASE_URL}/api/alerts/alerts/active/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward necessary headers from the original request
        'Cookie': request.headers.get('Cookie') || '',
        'X-Forwarded-For': request.headers.get('X-Forwarded-For') || '',
        'User-Agent': request.headers.get('User-Agent') || '',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const alerts = await response.json()
    
    // Transform Django response to match your frontend format if needed
    const transformedAlerts = alerts.results?.map((alert: any) => ({
      id: alert.id,
      type: mapAlertType(alert.alert_type),
      severity: mapSeverity(alert.severity),
      message: alert.message,
      timestamp: alert.created_at,
      recommendedAction: alert.recommended_action,
      // Include additional backend data
      originalData: alert
    })) || []

    return NextResponse.json(transformedAlerts)

  } catch (error) {
    console.error('Alerts API error:', error)
    
    // Fallback to mock data only in development
    if (process.env.NODE_ENV === 'development') {
      const mockAlerts = [
        {
          id: 1,
          type: 'tire_wear' as const,
          severity: 'high' as const,
          message: 'Front left tire degradation exceeding threshold',
          timestamp: new Date().toISOString(),
          recommendedAction: 'Consider pit stop within 3 laps'
        }
      ]
      return NextResponse.json(mockAlerts)
    }

    return NextResponse.json(
      { error: 'Failed to fetch alerts from racing analytics service' },
      { status: 502 }
    )
  }
}

// Helper functions to map backend values to frontend types
function mapAlertType(backendType: string): string {
  const typeMap: { [key: string]: string } = {
    'TIRE_WEAR': 'tire_wear',
    'FUEL_LOW': 'fuel',
    'WEATHER_CHANGE': 'weather',
    'STRATEGY_OPPORTUNITY': 'strategy',
    'COMPETITOR_THREAT': 'competitor',
    'SYSTEM_WARNING': 'system'
  }
  return typeMap[backendType] || 'system'
}

function mapSeverity(backendSeverity: string): string {
  const severityMap: { [key: string]: string } = {
    'LOW': 'low',
    'MEDIUM': 'medium', 
    'HIGH': 'high',
    'CRITICAL': 'critical'
  }
  return severityMap[backendSeverity] || 'medium'
}

// POST handler for acknowledging alerts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { alertId, action } = body

    if (action === 'acknowledge' && alertId) {
      const response = await fetch(`${API_BASE_URL}/api/alerts/alerts/${alertId}/acknowledge/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('Cookie') || '',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Backend responded with status: ${response.status}`)
      }

      const result = await response.json()
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Alerts POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process alert action' },
      { status: 500 }
    )
  }
}