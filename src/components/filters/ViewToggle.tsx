import { LayoutGrid, Rows3 } from 'lucide-react'
import type { ViewMode } from '#/lib/filter'

interface ViewToggleProps {
  view: ViewMode
  onChange: (view: ViewMode) => void
}

const OPTIONS: Array<{ value: ViewMode; label: string; Icon: typeof LayoutGrid }> = [
  { value: 'grid', label: 'Tampilan grid', Icon: LayoutGrid },
  { value: 'list', label: 'Tampilan daftar', Icon: Rows3 },
]

/** Grid ↔ detailed-list switch, styled like the other segmented controls. */
export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Mode tampilan"
      className="flex items-center gap-1 rounded-xl bg-surface p-1 ring-1 ring-border"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = view === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(value)}
            className={`grid h-7 w-8 place-items-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
              active
                ? 'bg-accent-strong text-accent-ink shadow-sm'
                : 'text-ink-muted hover:bg-white/5 hover:text-ink'
            }`}
          >
            <Icon aria-hidden className="h-4 w-4" />
            <span className="sr-only">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
