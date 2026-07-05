import { FORMAT_BUCKETS } from '#/lib/filter'
import type { FormatBucket } from '#/lib/filter'

export const FORMAT_BUCKET_LABELS: Record<FormatBucket, string> = {
  all: 'Semua',
  tv: 'TV',
  movie: 'Movie',
  ova: 'OVA·ONA',
}

interface FormatTabsProps {
  value: FormatBucket
  onChange: (format: FormatBucket) => void
  /** Full-width segmented variant for the mobile filter sheet. */
  fluid?: boolean
}

/** Segmented format filter — same control vocabulary as the season tablist. */
export function FormatTabs({
  value,
  onChange,
  fluid = false,
}: FormatTabsProps) {
  return (
    <div
      role="group"
      aria-label="Filter format"
      className={`flex items-center gap-1 rounded-xl p-1 ring-1 ring-border ${
        fluid ? 'w-full bg-surface-2' : 'bg-surface'
      }`}
    >
      {FORMAT_BUCKETS.map((bucket) => {
        const active = bucket === value
        return (
          <button
            key={bucket}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(bucket)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
              fluid ? 'flex-1' : 'shrink-0'
            } ${
              active
                ? 'bg-accent-strong text-accent-ink shadow-sm'
                : 'text-ink-muted hover:bg-white/5 hover:text-ink'
            }`}
          >
            {FORMAT_BUCKET_LABELS[bucket]}
          </button>
        )
      })}
    </div>
  )
}
