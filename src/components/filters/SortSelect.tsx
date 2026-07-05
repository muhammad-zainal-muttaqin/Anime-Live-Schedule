import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react'
import { Select } from '#/components/filters/Select'
import { NATURAL_DIR, SORT_KEYS } from '#/lib/filter'
import type { SeasonSearch, SortDir, SortKey } from '#/lib/filter'

export const SORT_LABELS: Record<SortKey, string> = {
  popularity: 'Popularitas',
  score: 'Skor',
  countdown: 'Tayang berikutnya',
  title: 'Judul',
  start: 'Tanggal mulai',
}

const SORT_OPTIONS = SORT_KEYS.map((key) => ({
  value: key,
  label: SORT_LABELS[key],
}))

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
      <Select
        label="Urutkan berdasarkan"
        value={sort}
        options={SORT_OPTIONS}
        onChange={(next) => onPatch({ sort: next, dir: undefined })}
      />
      <button
        type="button"
        aria-label="Balik arah urutan"
        aria-pressed={flipped}
        title={dir === 'desc' ? 'Menurun' : 'Menaik'}
        onClick={() => onPatch({ dir: dir === 'desc' ? 'asc' : 'desc' })}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface ring-1 transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
          flipped
            ? 'text-ink ring-accent-line'
            : 'text-ink-muted ring-border hover:ring-border-strong'
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
