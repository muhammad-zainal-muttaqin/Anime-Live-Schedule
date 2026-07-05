import { useEffect, useState } from 'react'

/**
 * Returns `Date.now()` that refreshes on the client at the given interval.
 * On the server (or before hydration) it returns 0 so SSR output is
 * deterministic; the client picks up the real time on first effect.
 */
export function useNow(intervalMs = 1_000): number {
  const [now, setNow] = useState(0)

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
