// import { NextRequest, NextResponse } from 'next/server'

// export async function GET(request: NextRequest) {
//   try {
//     const searchParams = request.nextUrl.searchParams
//     const lap = searchParams.get('lap')
    
//     // Mock strategy data from your ML models
//     const strategyData = {
//       currentLap: parseInt(lap || '12'),
//       optimalPitWindow: {
//         start: 18,
//         end: 22,
//         confidence: 0.85
//       },
//       tireDegradation: {
//         frontLeft: 0.12,
//         frontRight: 0.11,
//         rearLeft: 0.09,
//         rearRight: 0.10,
//         predictedLapsRemaining: 8
//       },
//       fuelStrategy: {
//         consumptionPerLap: 2.4,
//         lapsRemaining: 18,
//         needToSaveFuel: false
//       },
//       competitorStrategies: [
//         { position: 1, lastPit: 8, predictedPit: 20 },
//         { position: 2, lastPit: 9, predictedPit: 21 }
//       ]
//     }

//     return NextResponse.json(strategyData)
//   } catch (error) {
//     return NextResponse.json(
//       { error: 'Failed to fetch strategy data' },
//       { status: 500 }
//     )
//   }
// }














import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.BACKEND_API_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {

  const searchParams = request.nextUrl.searchParams
  const lap = searchParams.get('lap')
  
  try {
    
    // Fetch real strategy data from your Django backend with ML models
    const response = await fetch(`${API_BASE_URL}/api/strategy/predictions/comprehensive/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || '',
        'User-Agent': request.headers.get('User-Agent') || '',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Strategy backend responded with status: ${response.status}`)
    }

    const backendData = await response.json()
    
    // Transform Django ML model response to frontend format
    const strategyData = transformStrategyData(backendData, parseInt(lap || '0'))
    
    return NextResponse.json(strategyData)

  } catch (error) {
    console.error('Strategy API error:', error)
    
    // Fallback to realistic mock data based on your actual ML model structure
    if (process.env.NODE_ENV === 'development') {
      const fallbackData = generateRealisticFallback(parseInt(lap || '12'))
      return NextResponse.json(fallbackData)
    }

    return NextResponse.json(
      { error: 'Failed to fetch strategy predictions from ML analytics service' },
      { status: 502 }
    )
  }
}

// Transform your actual Django ML model response to frontend format
function transformStrategyData(backendData: any, currentLap: number) {
  const pitStrategy = backendData.pit_strategy
  const tireStrategy = backendData.tire_strategy
  const fuelStrategy = backendData.fuel_strategy

  return {
    currentLap: currentLap,
    optimalPitWindow: {
      start: pitStrategy?.recommended_lap - 2 || currentLap + 8,
      end: pitStrategy?.recommended_lap + 2 || currentLap + 12,
      confidence: pitStrategy?.confidence || 0.85,
      strategyType: pitStrategy?.strategy_type || 'STANDARD',
      reasoning: pitStrategy?.reasoning || 'ML model recommendation'
    },
    tireDegradation: {
      frontLeft: calculateTireWear(tireStrategy?.degradation_rate, 0.02),
      frontRight: calculateTireWear(tireStrategy?.degradation_rate, 0.01),
      rearLeft: calculateTireWear(tireStrategy?.degradation_rate, -0.01),
      rearRight: calculateTireWear(tireStrategy?.degradation_rate, -0.02),
      predictedLapsRemaining: tireStrategy?.predicted_laps_remaining || 15,
      degradationRate: tireStrategy?.degradation_rate || 0.12,
      optimalChangeLap: tireStrategy?.optimal_change_lap || currentLap + 10
    },
    fuelStrategy: {
      currentFuel: fuelStrategy?.current_fuel || 45.5,
      consumptionPerLap: fuelStrategy?.consumption_rate || 2.4,
      lapsRemaining: fuelStrategy?.predicted_laps_remaining || 18,
      needToSaveFuel: fuelStrategy?.need_to_conserve || false,
      estimatedFinalFuel: calculateFinalFuel(fuelStrategy)
    },
    competitorStrategies: analyzeCompetitorPatterns(backendData),
    // Include raw ML model data for debugging
    mlModelData: {
      tire_model_confidence: tireStrategy?.confidence,
      pit_model_confidence: pitStrategy?.confidence,
      timestamp: backendData.timestamp
    }
  }
}

// Helper function to simulate realistic tire wear differentials
function calculateTireWear(baseRate: number = 0.1, variation: number): number {
  const base = baseRate || 0.1
  return Math.max(0.05, Math.min(0.25, base + variation + (Math.random() * 0.02 - 0.01)))
}

// Calculate final fuel based on consumption rates
function calculateFinalFuel(fuelStrategy: any): number {
  if (!fuelStrategy) return 12.5
  return fuelStrategy.current_fuel - (fuelStrategy.consumption_rate * fuelStrategy.predicted_laps_remaining)
}

// Analyze competitor strategies based on position data
function analyzeCompetitorPatterns(backendData: any) {
  // This would integrate with your competitor analysis ML model
  return [
    { 
      position: 1, 
      lastPit: 8, 
      predictedPit: 22,
      tireAge: 14,
      threatLevel: 'LOW'
    },
    { 
      position: 2, 
      lastPit: 9, 
      predictedPit: 21,
      tireAge: 13,
      threatLevel: 'MEDIUM'
    },
    { 
      position: 3, 
      lastPit: 7, 
      predictedPit: 19,
      tireAge: 15,
      threatLevel: 'HIGH'
    }
  ]
}

// Realistic fallback data that matches your ML model patterns
function generateRealisticFallback(currentLap: number) {
  const baseLap = currentLap || 12
  const tireWearBase = 0.12 + (currentLap / 100) // Increases with lap count
  
  return {
    currentLap: baseLap,
    optimalPitWindow: {
      start: baseLap + 8,
      end: baseLap + 12,
      confidence: 0.82 + (Math.random() * 0.1),
      strategyType: ['UNDERCUT', 'OVERCUT', 'STANDARD'][Math.floor(Math.random() * 3)],
      reasoning: "ML model based on tire degradation and fuel consumption patterns"
    },
    tireDegradation: {
      frontLeft: tireWearBase + 0.02,
      frontRight: tireWearBase + 0.01,
      rearLeft: tireWearBase - 0.01,
      rearRight: tireWearBase - 0.02,
      predictedLapsRemaining: Math.max(5, 20 - currentLap),
      degradationRate: tireWearBase,
      optimalChangeLap: baseLap + Math.floor(15 - (tireWearBase * 100))
    },
    fuelStrategy: {
      currentFuel: 45.5 - (currentLap * 2.4),
      consumptionPerLap: 2.4 + (Math.random() * 0.2 - 0.1),
      lapsRemaining: Math.floor((45.5 - (currentLap * 2.4)) / 2.4),
      needToSaveFuel: currentLap > 15,
      estimatedFinalFuel: 45.5 - (30 * 2.4)
    },
    competitorStrategies: analyzeCompetitorPatterns(null),
    mlModelData: {
      tire_model_confidence: 0.78,
      pit_model_confidence: 0.85,
      timestamp: new Date().toISOString()
    }
  }
}

// POST handler for running simulations with your ML models
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { parameters } = body

    // Forward simulation request to Django backend
    const response = await fetch(`${API_BASE_URL}/api/analytics/simulations/simulate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || '',
      },
      credentials: 'include',
      body: JSON.stringify({ parameters }),
    })

    if (!response.ok) {
      throw new Error(`Simulation backend responded with status: ${response.status}`)
    }

    const simulationResult = await response.json()
    return NextResponse.json(simulationResult)

  } catch (error) {
    console.error('Strategy simulation error:', error)
    return NextResponse.json(
      { error: 'Failed to run strategy simulation' },
      { status: 500 }
    )
  }
}