import { LayoutGrid, Rows3 } from 'lucide-react'
import type { ViewMode } from '#/lib/filter'

interface ViewToggleProps {
  view: ViewMode
  onChange: (view: ViewMode) => void
  /** Full-width labeled variant for the mobile filter sheet. */
  fluid?: boolean
}

const OPTIONS: Array<{
  value: ViewMode
  label: string
  short: string
  Icon: typeof LayoutGrid
}> = [
  { value: 'grid', label: 'Tampilan grid', short: 'Grid', Icon: LayoutGrid },
  { value: 'list', label: 'Tampilan daftar', short: 'Daftar', Icon: Rows3 },
]

/** Grid ↔ detailed-list switch, styled like the other segmented controls. */
export function ViewToggle({ view, onChange, fluid = false }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Mode tampilan"
      className={`flex items-center gap-1 rounded-xl p-1 ring-1 ring-border ${
        fluid ? 'w-full bg-surface-2' : 'bg-surface'
      }`}
    >
      {OPTIONS.map(({ value, label, short, Icon }) => {
        const active = view === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(value)}
            className={`rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
              fluid
                ? 'flex h-9 flex-1 items-center justify-center gap-2 text-sm font-medium'
                : 'grid h-7 w-8 place-items-center'
            } ${
              active
                ? 'bg-accent-strong text-accent-ink shadow-sm'
                : 'text-ink-muted hover:bg-white/5 hover:text-ink'
            }`}
          >
            <Icon aria-hidden className="h-4 w-4" />
            {fluid ? short : <span className="sr-only">{label}</span>}
          </button>
        )
      })}
    </div>
  )
}
