import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'



export function formatLapTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, '0')}`
  }
  
  export function calculateTireHealth(wear: number[]): number {
    const avgWear = wear.reduce((a, b) => a + b, 0) / wear.length
    return Math.max(0, 100 - avgWear)
  }
  
  export function getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
    switch (severity) {
      case 'low': return 'bg-yellow-500'
      case 'medium': return 'bg-orange-500'
      case 'high': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }



export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

