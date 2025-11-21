import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // In production, this would fetch from your Django backend
    const mockTelemetry = {
      currentLap: 12,
      lapTime: '1:45.234',
      bestLap: '1:44.876',
      position: 3,
      gapToLeader: 2.5,
      tireWear: [85, 82, 78, 80], // FL, FR, RL, RR
      fuelRemaining: 45.2,
      fuelLapsRemaining: 18,
      sectorTimes: ['32.456', '35.123', '37.655'],
      trackTemp: 42,
      airTemp: 28
    }

    return NextResponse.json(mockTelemetry)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch telemetry' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Process telemetry data (would send to backend in production)
    console.log('Received telemetry:', body)
    
    return NextResponse.json({ status: 'received' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process telemetry' },
      { status: 500 }
    )
  }
}