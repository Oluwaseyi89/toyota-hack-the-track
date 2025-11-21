import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StrategyData } from '@/types/strategy'
import { Badge } from '@/components/ui/badge'

interface StrategyTimelineProps {
  strategy: StrategyData | null
}

export default function StrategyTimeline({ strategy }: StrategyTimelineProps) {
  if (!strategy) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Race Strategy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Optimal Pit Window */}
          <div>
            <h4 className="text-sm font-medium mb-3">Optimal Pit Window</h4>
            <div className="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-500 rounded-lg">
              <div>
                <div className="font-semibold">
                  Laps {strategy.optimalPitWindow.start} - {strategy.optimalPitWindow.end}
                </div>
                <div className="text-sm text-blue-300">
                  Confidence: {(strategy.optimalPitWindow.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <Badge variant="default">Recommended</Badge>
            </div>
          </div>

          {/* Tire Strategy */}
          <div>
            <h4 className="text-sm font-medium mb-3">Tire Status</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-300">Best Life</div>
                <div className="font-semibold text-green-400">
                  {Math.max(...Object.values(strategy.tireDegradation).slice(0, 4))}%
                </div>
              </div>
              <div className="p-3 bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-300">Worst Life</div>
                <div className="font-semibold text-red-400">
                  {Math.min(...Object.values(strategy.tireDegradation).slice(0, 4))}%
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-300">
              Predicted remaining: {strategy.tireDegradation.predictedLapsRemaining} laps
            </div>
          </div>

          {/* Competitor Strategies */}
          <div>
            <h4 className="text-sm font-medium mb-3">Competitor Analysis</h4>
            <div className="space-y-2">
              {strategy.competitorStrategies.slice(0, 3).map((competitor, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                  <span>P{competitor.position}</span>
                  <span className="text-sm text-gray-300">
                    Last pit: Lap {competitor.lastPit}
                  </span>
                  <Badge variant="outline">
                    Pit ~L{competitor.predictedPit}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}