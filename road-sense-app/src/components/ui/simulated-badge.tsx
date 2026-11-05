import { cn } from '@/lib/utils'

interface SimulatedBadgeProps {
  /** Render nothing unless the value is flagged as simulated */
  show?: boolean
  className?: string
}

/**
 * Marks values produced from simulated data or heuristic assumptions
 * (the backend's `is_simulated` flag) rather than measurements or a trained model.
 */
export function SimulatedBadge({ show = true, className }: SimulatedBadgeProps) {
  if (!show) return null

  return (
    <span
      title="Estimated from simulated data or heuristic assumptions, not from measured data or a trained model"
      className={cn(
        'inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10',
        'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300',
        className
      )}
    >
      Simulated
    </span>
  )
}
