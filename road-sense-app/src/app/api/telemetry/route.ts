// import { NextRequest, NextResponse } from 'next/server'

// export async function GET(request: NextRequest) {
//   try {
//     // In production, this would fetch from your Django backend
//     const mockTelemetry = {
//       currentLap: 12,
//       lapTime: '1:45.234',
//       bestLap: '1:44.876',
//       position: 3,
//       gapToLeader: 2.5,
//       tireWear: [85, 82, 78, 80], // FL, FR, RL, RR
//       fuelRemaining: 45.2,
//       fuelLapsRemaining: 18,
//       sectorTimes: ['32.456', '35.123', '37.655'],
//       trackTemp: 42,
//       airTemp: 28
//     }

//     return NextResponse.json(mockTelemetry)
//   } catch (error) {
//     return NextResponse.json(
//       { error: 'Failed to fetch telemetry' },
//       { status: 500 }
//     )
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
//     // Process telemetry data (would send to backend in production)
//     console.log('Received telemetry:', body)
    
//     return NextResponse.json({ status: 'received' })
//   } catch (error) {
//     return NextResponse.json(
//       { error: 'Failed to process telemetry' },
//       { status: 500 }
//     )
//   }
// }










import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.BACKEND_API_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const vehicleId = searchParams.get('vehicle')
    const laps = searchParams.get('laps') || '10'

    // Fetch real telemetry from your Django backend
    const response = await fetch(`${API_BASE_URL}/api/telemetry/data/current/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || '',
        'User-Agent': request.headers.get('User-Agent') || '',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Telemetry backend responded with status: ${response.status}`)
    }

    const backendData = await response.json()
    
    // Transform Django telemetry models to frontend format
    const telemetryData = transformTelemetryData(backendData, vehicleId)
    
    return NextResponse.json(telemetryData)

  } catch (error) {
    console.error('Telemetry API error:', error)
    
    // Fallback to realistic mock data based on your actual models
    if (process.env.NODE_ENV === 'development') {
      const fallbackData = generateRealisticTelemetry()
      return NextResponse.json(fallbackData)
    }

    return NextResponse.json(
      { error: 'Failed to fetch real-time telemetry from racing analytics service' },
      { status: 502 }
    )
  }
}

// Transform your actual Django telemetry models to frontend format
async function transformTelemetryData(backendData: any, vehicleId: string | null) {
  const telemetryList = backendData.data || []
  const userPreferences = backendData.user_preferences || {}
  
  // Get the latest telemetry record or filter by vehicle
  let latestTelemetry = telemetryList[0]
  if (vehicleId && telemetryList.length > 0) {
    latestTelemetry = telemetryList.find((t: any) => 
      t.vehicle?.vehicle_id === vehicleId || t.vehicle?.id?.toString() === vehicleId
    ) || telemetryList[0]
  }

  if (!latestTelemetry) {
    return generateRealisticTelemetry()
  }

  const vehicle = latestTelemetry.vehicle
  const tireData = latestTelemetry.tire_data

  return {
    // Vehicle identification from your Vehicle model
    vehicle: {
      id: vehicle?.id,
      number: vehicle?.number,
      team: vehicle?.team,
      driver: vehicle?.driver,
      vehicle_id: vehicle?.vehicle_id
    },
    
    // Race position data
    currentLap: latestTelemetry.lap_number,
    position: latestTelemetry.position,
    gapToLeader: latestTelemetry.gap_to_leader,
    
    // Timing data from TelemetryData model
    lapTime: formatLapTime(latestTelemetry.lap_time_seconds),
    lapTimeSeconds: latestTelemetry.lap_time_seconds,
    bestLap: calculateBestLap(telemetryList),
    
    // Sector times from your sector time fields
    sectorTimes: [
      formatSectorTime(latestTelemetry.sector1_time),
      formatSectorTime(latestTelemetry.sector2_time), 
      formatSectorTime(latestTelemetry.sector3_time)
    ],
    sectorTimesSeconds: [
      latestTelemetry.sector1_time ? durationToSeconds(latestTelemetry.sector1_time) : null,
      latestTelemetry.sector2_time ? durationToSeconds(latestTelemetry.sector2_time) : null,
      latestTelemetry.sector3_time ? durationToSeconds(latestTelemetry.sector3_time) : null
    ],
    
    // Performance metrics
    speed: latestTelemetry.speed,
    rpm: latestTelemetry.rpm,
    gear: latestTelemetry.gear,
    throttle: latestTelemetry.throttle,
    brake: latestTelemetry.brake,
    
    // Tire data from your TireTelemetry model
    tireWear: calculateTireWear(tireData),
    tireTemperatures: {
      frontLeft: tireData?.front_left_temp,
      frontRight: tireData?.front_right_temp, 
      rearLeft: tireData?.rear_left_temp,
      rearRight: tireData?.rear_right_temp
    },
    tirePressures: {
      frontLeft: tireData?.front_left_pressure,
      frontRight: tireData?.front_right_pressure,
      rearLeft: tireData?.rear_left_pressure,
      rearRight: tireData?.rear_right_pressure
    },
    
    // Fuel data (would come from your FuelStrategy model)
    fuelRemaining: 45.2 - (latestTelemetry.lap_number * 2.4),
    fuelLapsRemaining: Math.floor((45.2 - (latestTelemetry.lap_number * 2.4)) / 2.4),
    
    // Weather data (would come from your WeatherData model)
    trackTemp: await getCurrentTrackTemperature(),
    airTemp: await getCurrentAirTemperature(),
    
    // Metadata
    timestamp: latestTelemetry.timestamp,
    userPreferences: userPreferences,
    
    // Raw data for debugging
    rawTelemetry: latestTelemetry
  }
}

// Helper functions for data transformation
function formatLapTime(seconds: number): string {
  if (!seconds) return '--:--.---'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, '0')}`
}

function formatSectorTime(duration: any): string {
  if (!duration) return '--.---'
  const seconds = typeof duration === 'number' ? duration : durationToSeconds(duration)
  return seconds.toFixed(3)
}

function durationToSeconds(duration: any): number {
  if (typeof duration === 'number') return duration
  if (typeof duration === 'string') {
    // Handle ISO duration string or time string
    if (duration.includes(':')) {
      const parts = duration.split(':')
      if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1])
      if (parts.length === 3) return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2])
    }
  }
  return 30.0 // Default fallback
}

function calculateBestLap(telemetryList: any[]): string {
  if (!telemetryList.length) return '--:--.---'
  const bestLap = Math.min(...telemetryList.map(t => t.lap_time_seconds).filter(Boolean))
  return formatLapTime(bestLap)
}

function calculateTireWear(tireData: any): number[] {
  if (!tireData) return [85, 82, 78, 80]
  
  // Calculate tire wear based on temperatures and pressures
  const baseWear = 85
  const tempImpact = (temp: number) => Math.max(0, Math.min(15, (temp - 90) / 2))
  const pressureImpact = (pressure: number) => Math.max(0, Math.min(10, Math.abs(27.5 - pressure) * 2))
  
  return [
    baseWear - tempImpact(tireData.front_left_temp) - pressureImpact(tireData.front_left_pressure),
    baseWear - tempImpact(tireData.front_right_temp) - pressureImpact(tireData.front_right_pressure),
    baseWear - tempImpact(tireData.rear_left_temp) - pressureImpact(tireData.rear_left_pressure),
    baseWear - tempImpact(tireData.rear_right_temp) - pressureImpact(tireData.rear_right_pressure)
  ]
}

// Fetch current weather data from your backend
async function getCurrentTrackTemperature(): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/telemetry/weather/current/`, {
      credentials: 'include',
    })
    if (response.ok) {
      const weather = await response.json()
      return weather.track_temperature || 42
    }
  } catch (error) {
    console.error('Failed to fetch weather data:', error)
  }
  return 42 // Default fallback
}

async function getCurrentAirTemperature(): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/telemetry/weather/current/`, {
      credentials: 'include',
    })
    if (response.ok) {
      const weather = await response.json()
      return weather.air_temperature || 28
    }
  } catch (error) {
    console.error('Failed to fetch weather data:', error)
  }
  return 28 // Default fallback
}

// Realistic fallback based on your actual model structure
function generateRealisticTelemetry() {
  const currentLap = Math.floor(Math.random() * 30) + 1
  const baseLapTime = 105.0 + (Math.random() * 2 - 1) // Around 1:45.0
  
  return {
    vehicle: {
      id: 1,
      number: 42,
      team: 'Toyota GR',
      driver: 'Demo Driver',
      vehicle_id: 'gr_42'
    },
    currentLap,
    position: 3,
    gapToLeader: 2.5 + (Math.random() * 1 - 0.5),
    lapTime: formatLapTime(baseLapTime),
    lapTimeSeconds: baseLapTime,
    bestLap: formatLapTime(baseLapTime - 0.8),
    sectorTimes: [
      (32.0 + Math.random() * 0.5).toFixed(3),
      (35.0 + Math.random() * 0.5).toFixed(3),
      (37.0 + Math.random() * 0.5).toFixed(3)
    ],
    speed: 185 + Math.random() * 20,
    rpm: 12000 + Math.floor(Math.random() * 3000),
    gear: 5 + Math.floor(Math.random() * 3),
    throttle: 85 + Math.random() * 15,
    brake: Math.random() > 0.8 ? 80 + Math.random() * 20 : 0,
    tireWear: [85, 82, 78, 80].map(w => Math.max(40, w - (currentLap * 1.5))),
    tireTemperatures: {
      frontLeft: 95 + Math.random() * 10,
      frontRight: 93 + Math.random() * 10,
      rearLeft: 88 + Math.random() * 8,
      rearRight: 90 + Math.random() * 8
    },
    tirePressures: {
      frontLeft: 27.0 + Math.random() * 1,
      frontRight: 27.2 + Math.random() * 1,
      rearLeft: 26.8 + Math.random() * 1,
      rearRight: 27.1 + Math.random() * 1
    },
    fuelRemaining: 45.2 - (currentLap * 2.4),
    fuelLapsRemaining: Math.floor((45.2 - (currentLap * 2.4)) / 2.4),
    trackTemp: 42,
    airTemp: 28,
    timestamp: new Date().toISOString()
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Forward telemetry data to Django backend for processing
    const response = await fetch(`${API_BASE_URL}/api/telemetry/data/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || '',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Telemetry backend responded with status: ${response.status}`)
    }

    const result = await response.json()
    
    // Trigger WebSocket updates through your signals
    await triggerWebSocketUpdate(result)
    
    return NextResponse.json({ 
      status: 'processed', 
      id: result.id,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Telemetry POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process telemetry data' },
      { status: 500 }
    )
  }
}

// Trigger WebSocket update through a separate call
async function triggerWebSocketUpdate(telemetryData: any) {
  try {
    // This would trigger your Django signals to broadcast via WebSocket
    await fetch(`${API_BASE_URL}/api/telemetry/data/${telemetryData.id}/notify/`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch (error) {
    console.error('WebSocket trigger failed:', error)
  }
}