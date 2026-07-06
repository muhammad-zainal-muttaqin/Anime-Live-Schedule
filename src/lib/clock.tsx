import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

const ClockContext = createContext(0)

/**
 * One shared 1 Hz clock for the whole app. Replaces per-component `useNow`
 * timers: a 100+ card grid would otherwise spin up 100+ intervals and re-render
 * every card every second. Here a single interval lives at the root and only
 * components that call `useClock` (the airing countdowns) re-render on each
 * tick — the provider's `children` are a stable prop, so the rest of the tree
 * is untouched.
 *
 * Starts at 0 so SSR output is deterministic; the client sets the real time on
 * mount (matching the old `useNow` behaviour, so hydration stays stable).
 */
export function ClockProvider({
  children,
  intervalMs = 1_000,
}: {
  children: ReactNode
  intervalMs?: number
}) {
  const [now, setNow] = useState(0)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return <ClockContext.Provider value={now}>{children}</ClockContext.Provider>
}

/** Current time (ms) from the shared clock. 0 on the server / before mount. */
export function useClock(): number {
  return useContext(ClockContext)
}
