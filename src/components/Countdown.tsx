import { useClock } from '#/lib/clock'
import { formatTimeUntil } from '#/lib/format'

/**
 * Live "time until airing" text bound to the shared clock. Rendered as its own
 * tiny component so that only this node re-renders each tick; the enclosing
 * card/row/modal never subscribes to the clock and stays put.
 */
export function Countdown({ airingAt }: { airingAt: number }): string {
  const now = useClock()
  return formatTimeUntil(airingAt, now)
}
