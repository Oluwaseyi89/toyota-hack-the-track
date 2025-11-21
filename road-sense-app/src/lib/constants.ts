export const TIRE_WEAR_THRESHOLDS = {
    optimal: 80,
    warning: 60,
    critical: 40
  } as const
  
  export const FUEL_CRITICAL_LEVEL = 10 // liters
  
  export const WEATHER_IMPACT = {
    low: 0.5,
    medium: 2.0,
    high: 5.0
  } as const
  
  export const SECTOR_NAMES = ['Sector 1', 'Sector 2', 'Sector 3'] as const