import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Mock alerts from your prediction models
    const alerts = [
      {
        id: 1,
        type: 'tire_wear' as const,
        severity: 'high' as const,
        message: 'Front left tire degradation exceeding threshold',
        timestamp: new Date().toISOString(),
        recommendedAction: 'Consider pit stop within 3 laps'
      },
      {
        id: 2,
        type: 'fuel' as const,
        severity: 'medium' as const,
        message: 'Fuel consumption 5% higher than predicted',
        timestamp: new Date().toISOString(),
        recommendedAction: 'Review fuel saving opportunities'
      },
      {
        id: 3,
        type: 'weather' as const,
        severity: 'low' as const,
        message: 'Light rain expected in 10 laps',
        timestamp: new Date().toISOString(),
        recommendedAction: 'Monitor track conditions'
      }
    ]

    return NextResponse.json(alerts)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}