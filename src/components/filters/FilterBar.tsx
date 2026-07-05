import { FormatTabs } from '#/components/filters/FormatTabs'
import { GenreMenu } from '#/components/filters/GenreMenu'
import { SearchInput } from '#/components/filters/SearchInput'
import { SortSelect } from '#/components/filters/SortSelect'
import { ViewToggle } from '#/components/filters/ViewToggle'
import { withGenreToggled, type SeasonFilters, type SeasonSearch } from '#/lib/filter'

interface FilterBarProps {
  filters: SeasonFilters
  genreOptions: Array<{ genre: string; count: number }>
  onPatch: (patch: Partial<SeasonSearch>) => void
}

/**
 * The season toolbar: format · search · genre · adult · sort · view.
 * Wraps instead of scrolling so the genre panel is never inside an
 * overflow container (which would clip it).
 */
export function FilterBar({ filters, genreOptions, onPatch }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FormatTabs value={filters.format} onChange={(format) => onPatch({ format })} />
      <SearchInput
        value={filters.q}
        onChange={(q) => onPatch({ q })}
        className="order-last min-w-44 basis-full sm:order-none sm:flex-1 sm:basis-auto"
      />
      <GenreMenu
        options={genreOptions}
        selected={filters.genres}
        onToggle={(genre) => onPatch({ genre: withGenreToggled(filters, genre) })}
        onClear={() => onPatch({ genre: '' })}
      />
      <AdultToggle
        checked={filters.includeAdult}
        onChange={(includeAdult) => onPatch({ includeAdult: includeAdult || undefined })}
      />
      <SortSelect sort={filters.sort} dir={filters.dir} onPatch={(patch) => onPatch(patch)} />
      <ViewToggle view={filters.view} onChange={(view) => onPatch({ view })} />
    </div>
  )
}

function AdultToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-border accent-accent-strong"
      />
      +16
    </label>
  )
}
