import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown } from 'lucide-react'
import { NATURAL_DIR, SORT_KEYS, type SeasonSearch, type SortDir, type SortKey } from '#/lib/filter'

const LABELS: Record<SortKey, string> = {
  popularity: 'Popularitas',
  score: 'Skor',
  countdown: 'Tayang berikutnya',
  title: 'Judul',
  start: 'Tanggal mulai',
}

interface SortSelectProps {
  sort: SortKey
  dir: SortDir
  onPatch: (patch: Pick<SeasonSearch, 'sort' | 'dir'>) => void
}

/** Sort key select + a direction flip that resets when the key changes. */
export function SortSelect({ sort, dir, onPatch }: SortSelectProps) {
  const flipped = dir !== NATURAL_DIR[sort]
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <label className="sr-only" htmlFor="sort-select">
          Urutkan berdasarkan
        </label>
        <select
          id="sort-select"
          value={sort}
          onChange={(e) => onPatch({ sort: e.target.value as SortKey, dir: undefined })}
          className="h-9 appearance-none rounded-lg bg-surface pl-3 pr-9 text-sm font-medium text-ink ring-1 ring-border transition hover:ring-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
        >
          {SORT_KEYS.map((key) => (
            <option key={key} value={key} className="bg-elevated text-ink">
              {LABELS[key]}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
        />
      </div>
      <button
        type="button"
        aria-label="Balik arah urutan"
        aria-pressed={flipped}
        title={dir === 'desc' ? 'Menurun' : 'Menaik'}
        onClick={() => onPatch({ dir: dir === 'desc' ? 'asc' : 'desc' })}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface ring-1 transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
          flipped ? 'text-ink ring-accent-line' : 'text-ink-muted ring-border hover:ring-border-strong'
        }`}
      >
        {dir === 'desc' ? (
          <ArrowDownWideNarrow className="h-4 w-4" />
        ) : (
          <ArrowUpNarrowWide className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}
