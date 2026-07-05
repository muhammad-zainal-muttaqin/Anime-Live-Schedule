import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { FilterSheet } from '#/components/filters/FilterSheet'
import { FormatTabs } from '#/components/filters/FormatTabs'
import { GenreMenu } from '#/components/filters/GenreMenu'
import { SearchInput } from '#/components/filters/SearchInput'
import { SortSelect } from '#/components/filters/SortSelect'
import { ViewToggle } from '#/components/filters/ViewToggle'
import { withGenreToggled } from '#/lib/filter'
import type { SeasonFilters, SeasonSearch } from '#/lib/filter'

interface FilterBarProps {
  filters: SeasonFilters
  genreOptions: Array<{ genre: string; count: number }>
  resultCount: number
  onPatch: (patch: Partial<SeasonSearch>) => void
}

/**
 * The season toolbar. Desktop (≥sm) lays every facet inline:
 * format · search · genre (with 16+) · sort · view. Mobile collapses to
 * search + one Filter button that opens the bottom sheet — the toolbar
 * stays one row instead of stacking four.
 */
export function FilterBar({
  filters,
  genreOptions,
  resultCount,
  onPatch,
}: FilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const activeCount =
    (filters.format !== 'all' ? 1 : 0) +
    filters.genres.length +
    (filters.includeAdult ? 1 : 0)

  return (
    <>
      {/* Mobile: search + sheet trigger. */}
      <div className="flex items-center gap-2 sm:hidden">
        <SearchInput
          value={filters.q}
          onChange={(q) => onPatch({ q })}
          className="min-w-0 flex-1"
        />
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setSheetOpen(true)}
          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-surface px-3 text-sm font-medium ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
            activeCount > 0
              ? 'text-ink ring-accent-line'
              : 'text-ink-muted ring-border'
          }`}
        >
          <SlidersHorizontal aria-hidden className="h-4 w-4" />
          Filter
          {activeCount > 0 ? (
            <span className="rounded-full bg-accent-soft px-1.5 text-xs font-semibold text-accent tabular-nums">
              {activeCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* Desktop: everything inline. */}
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        <FormatTabs
          value={filters.format}
          onChange={(format) => onPatch({ format })}
        />
        <SearchInput
          value={filters.q}
          onChange={(q) => onPatch({ q })}
          className="min-w-44 flex-1"
        />
        <GenreMenu
          options={genreOptions}
          selected={filters.genres}
          onToggle={(genre) =>
            onPatch({ genre: withGenreToggled(filters, genre) })
          }
          onClear={() => onPatch({ genre: '' })}
          includeAdult={filters.includeAdult}
          onAdultChange={(includeAdult) =>
            onPatch({ includeAdult: includeAdult || undefined })
          }
        />
        <SortSelect
          sort={filters.sort}
          dir={filters.dir}
          onPatch={(patch) => onPatch(patch)}
        />
        <ViewToggle
          view={filters.view}
          onChange={(view) => onPatch({ view })}
        />
      </div>

      {sheetOpen ? (
        <FilterSheet
          filters={filters}
          genreOptions={genreOptions}
          resultCount={resultCount}
          onPatch={onPatch}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </>
  )
}
