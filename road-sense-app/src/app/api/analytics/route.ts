import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.BACKEND_API_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'summary'
    const laps = searchParams.get('laps') || '50'

    let backendUrl: string
    let transformFunction: (data: any) => any

    switch (type) {
      case 'performance':
        backendUrl = '/api/analytics/performance/current/'
        transformFunction = transformPerformanceData
        break
      case 'simulations':
        backendUrl = '/api/analytics/simulations/'
        transformFunction = transformSimulationData
        break
      case 'competitors':
        backendUrl = '/api/analytics/competitors/'
        transformFunction = transformCompetitorData
        break
      case 'summary':
      default:
        backendUrl = '/api/analytics/summary/dashboard/'
        transformFunction = transformDashboardData
        break
    }

    const response = await fetch(`${API_BASE_URL}${backendUrl}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || '',
        'User-Agent': request.headers.get('User-Agent') || '',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Analytics backend responded with status: ${response.status}`)
    }

    const backendData = await response.json()
    const transformedData = transformFunction(backendData)
    
    return NextResponse.json(transformedData)

  } catch (error) {
    console.error('Analytics API error:', error)
    
    // Development fallback with realistic data
    if (process.env.NODE_ENV === 'development') {
      const fallbackData = generateAnalyticsFallback()
      return NextResponse.json(fallbackData)
    }

    return NextResponse.json(
      { error: 'Failed to fetch analytics data from performance service' },
      { status: 502 }
    )
  }
}

// Transform performance analysis data
function transformPerformanceData(backendData: any) {
  const analysis = backendData // Assuming single analysis object
  
  return {
    performanceMetrics: {
      lapNumber: analysis.lap_number,
      sectorTimes: analysis.sector_times || [32.456, 35.123, 37.655],
      predictedLapTime: analysis.predicted_lap_time,
      actualLapTime: analysis.actual_lap_time,
      impacts: {
        tire: analysis.tire_degradation_impact || 0.15,
        fuel: analysis.fuel_impact || 0.05,
        weather: analysis.weather_impact || 0.08
      }
    },
    vehicle: analysis.vehicle,
    analysisTimestamp: analysis.analysis_timestamp,
    recommendations: generatePerformanceRecommendations(analysis)
  }
}

// Transform simulation data
function transformSimulationData(backendData: any) {
  const simulations = backendData.results || [backendData]
  
  return {
    simulations: simulations.map((sim: any) => ({
      id: sim.simulation_id,
      parameters: sim.parameters,
      results: {
        optimalPitLap: sim.results?.optimal_pit_lap || sim.results?.optimalPitLap,
        predictedPosition: sim.results?.predicted_finish_position || sim.results?.predictedPosition,
        totalTime: sim.results?.expected_total_time || sim.results?.totalTime,
        confidence: sim.results?.confidence || 0.75,
        impacts: {
          tire: sim.results?.tire_degradation_impact || 12.5,
          fuel: sim.results?.fuel_impact || 3.2,
          weather: sim.results?.weather_impact || 5.1
        }
      },
      createdAt: sim.created_at,
      isCompleted: sim.is_completed
    })),
    summary: {
      totalSimulations: simulations.length,
      completed: simulations.filter((s: any) => s.is_completed).length,
      averageConfidence: calculateAverageConfidence(simulations)
    }
  }
}

// Transform competitor analysis data
function transformCompetitorData(backendData: any) {
  const competitors = backendData.results || [backendData]
  
  return {
    competitors: competitors.map((comp: any) => ({
      position: comp.position,
      vehicle: comp.vehicle,
      lastPitLap: comp.last_pit_lap,
      predictedPitLap: comp.predicted_pit_lap,
      tireAge: comp.tire_age_laps,
      threatLevel: comp.threat_level || 'MEDIUM',
      gapToLeader: comp.gap_to_leader,
      recentPace: comp.recent_lap_times || []
    })),
    strategicThreats: identifyStrategicThreats(competitors)
  }
}

// Transform comprehensive dashboard data
function transformDashboardData(backendData: any) {
  return {
    performanceSummary: {
      recentAnalyses: backendData.performance_analysis?.map(transformPerformanceData) || [],
      trend: calculatePerformanceTrend(backendData.performance_analysis),
      consistency: calculateLapConsistency(backendData.performance_analysis)
    },
    simulations: transformSimulationData({ results: backendData.simulation_results }),
    competitorAnalysis: transformCompetitorData({ results: backendData.competitor_analysis }),
    strategicInsights: generateStrategicInsights(backendData),
    timestamp: backendData.timestamp || new Date().toISOString()
  }
}

// Helper functions
function generatePerformanceRecommendations(analysis: any) {
  const recommendations = []
  
  if (analysis.tire_degradation_impact > 0.2) {
    recommendations.push({
      type: 'TIRE_MANAGEMENT',
      priority: 'HIGH',
      message: 'High tire degradation impacting lap times',
      action: 'Consider earlier pit stop or adjust driving style'
    })
  }
  
  if (analysis.fuel_impact > 0.1) {
    recommendations.push({
      type: 'FUEL_SAVING', 
      priority: 'MEDIUM',
      message: 'Fuel load significantly affecting performance',
      action: 'Review fuel saving opportunities in sector 2'
    })
  }
  
  return recommendations
}

function calculateAverageConfidence(simulations: any[]) {
  if (!simulations.length) return 0
  const total = simulations.reduce((sum, sim) => sum + (sim.results?.confidence || 0), 0)
  return total / simulations.length
}

function identifyStrategicThreats(competitors: any[]) {
  return competitors
    .filter(comp => comp.threat_level === 'HIGH')
    .map(comp => ({
      vehicle: comp.vehicle,
      reason: 'Similar strategy with fresher tires',
      expectedOvertakeLap: comp.predicted_pit_lap + 3
    }))
}

function calculatePerformanceTrend(analyses: any[]) {
  if (!analyses || analyses.length < 2) return 'STABLE'
  const recent = analyses.slice(0, 3)
  const avgRecent = recent.reduce((sum, a) => sum + (a.predicted_lap_time || 0), 0) / recent.length
  const avgPrevious = analyses.slice(3, 6).reduce((sum, a) => sum + (a.predicted_lap_time || 0), 0) / 3
  return avgRecent < avgPrevious ? 'IMPROVING' : avgRecent > avgPrevious ? 'DECLINING' : 'STABLE'
}

function calculateLapConsistency(analyses: any[]) {
  if (!analyses || analyses.length < 3) return 0.95
  const times = analyses.map(a => a.predicted_lap_time || a.actual_lap_time).filter(Boolean)
  const avg = times.reduce((sum, t) => sum + t, 0) / times.length
  const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length
  return Math.max(0, 1 - (variance / avg))
}

function generateStrategicInsights(backendData: any) {
  return [
    {
      type: 'UNDERCUT_OPPORTUNITY',
      confidence: 0.75,
      message: 'Car ahead showing tire degradation, undercut possible in 2-3 laps',
      potentialGain: 1, // positions
      risk: 'LOW'
    },
    {
      type: 'WEATHER_ADVANTAGE',
      confidence: 0.65, 
      message: 'Current setup better suited for predicted rain in 10 laps',
      potentialGain: 2, // positions
      risk: 'MEDIUM'
    }
  ]
}

// Realistic fallback data
function generateAnalyticsFallback() {
  const currentLap = Math.floor(Math.random() * 30) + 10
  
  return {
    performanceSummary: {
      recentAnalyses: [
        {
          performanceMetrics: {
            lapNumber: currentLap,
            sectorTimes: [32.456, 35.123, 37.655],
            predictedLapTime: 105.234,
            actualLapTime: 105.456,
            impacts: {
              tire: 0.15,
              fuel: 0.05,
              weather: 0.08
            }
          },
          recommendations: [
            {
              type: 'TIRE_MANAGEMENT',
              priority: 'MEDIUM',
              message: 'Monitor front-left tire wear closely',
              action: 'Consider pit stop around lap 25'
            }
          ]
        }
      ],
      trend: 'STABLE',
      consistency: 0.92
    },
    simulations: {
      simulations: [
        {
          id: 'sim_20241201_142356',
          parameters: { strategy: 'AGGRESSIVE', weather: 'DRY' },
          results: {
            optimalPitLap: 22,
            predictedPosition: 2,
            totalTime: 2732.15,
            confidence: 0.78,
            impacts: {
              tire: 12.5,
              fuel: 3.2,
              weather: 5.1
            }
          },
          isCompleted: true
        }
      ],
      summary: {
        totalSimulations: 5,
        completed: 3,
        averageConfidence: 0.72
      }
    },
    competitorAnalysis: {
      competitors: [
        {
          position: 1,
          vehicle: { number: 1, driver: 'Leader', team: 'Competitor' },
          lastPitLap: 8,
          predictedPitLap: 24,
          tireAge: 16,
          threatLevel: 'HIGH',
          gapToLeader: 0
        }
      ],
      strategicThreats: [
        {
          vehicle: { number: 1, driver: 'Leader', team: 'Competitor' },
          reason: 'Long first stint, may undercut',
          expectedOvertakeLap: 27
        }
      ]
    },
    strategicInsights: generateStrategicInsights(null),
    timestamp: new Date().toISOString()
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, parameters } = body

    if (action === 'simulate') {
      // Run race simulation
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
        throw new Error(`Simulation failed with status: ${response.status}`)
      }

      const result = await response.json()
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: 'Invalid analytics action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Analytics POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process analytics request' },
      { status: 500 }
    )
  }
}