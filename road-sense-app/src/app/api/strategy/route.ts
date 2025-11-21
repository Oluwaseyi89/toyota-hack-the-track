import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lap = searchParams.get('lap')
    
    // Mock strategy data from your ML models
    const strategyData = {
      currentLap: parseInt(lap || '12'),
      optimalPitWindow: {
        start: 18,
        end: 22,
        confidence: 0.85
      },
      tireDegradation: {
        frontLeft: 0.12,
        frontRight: 0.11,
        rearLeft: 0.09,
        rearRight: 0.10,
        predictedLapsRemaining: 8
      },
      fuelStrategy: {
        consumptionPerLap: 2.4,
        lapsRemaining: 18,
        needToSaveFuel: false
      },
      competitorStrategies: [
        { position: 1, lastPit: 8, predictedPit: 20 },
        { position: 2, lastPit: 9, predictedPit: 21 }
      ]
    }

    return NextResponse.json(strategyData)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch strategy data' },
      { status: 500 }
    )
  }
}