export interface TelemetryData {
    currentLap: number
    lapTime: string
    bestLap: string
    position: number
    gapToLeader: number
    tireWear: number[] // [FL, FR, RL, RR]
    fuelRemaining: number
    fuelLapsRemaining: number
    sectorTimes: string[]
    trackTemp: number
    airTemp: number
    timestamp?: string
  }
  
  export interface LapTimeData {
    lapNumber: number
    time: number
    sector1: number
    sector2: number
    sector3: number
    tireAge: number
  }