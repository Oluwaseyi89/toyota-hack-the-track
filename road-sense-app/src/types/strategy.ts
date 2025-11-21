export interface StrategyData {
    currentLap: number
    optimalPitWindow: {
      start: number
      end: number
      confidence: number
    }
    tireDegradation: {
      frontLeft: number
      frontRight: number
      rearLeft: number
      rearRight: number
      predictedLapsRemaining: number
    }
    fuelStrategy: {
      consumptionPerLap: number
      lapsRemaining: number
      needToSaveFuel: boolean
    }
    competitorStrategies: CompetitorStrategy[]
  }
  
  export interface CompetitorStrategy {
    position: number
    lastPit: number
    predictedPit: number
  }
  
  export interface Alert {
    id: number
    type: 'tire_wear' | 'fuel' | 'weather' | 'strategy'
    severity: 'low' | 'medium' | 'high'
    message: string
    timestamp: string
    recommendedAction: string
  }