import { useRef } from 'react'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Check, X } from 'lucide-react'
import { FormatTabs } from '#/components/filters/FormatTabs'
import { AdultToggleRow, GenreList } from '#/components/filters/GenreMenu'
import { SORT_LABELS } from '#/components/filters/SortSelect'
import { ViewToggle } from '#/components/filters/ViewToggle'
import { useDialog } from '#/lib/hooks'
import {
  NATURAL_DIR,
  RESET_PATCH,
  SORT_KEYS,
  hasActiveFilters,
  withGenreToggled,
} from '#/lib/filter'
import type { SeasonFilters, SeasonSearch, SortDir } from '#/lib/filter'

interface FilterSheetProps {
  filters: SeasonFilters
  genreOptions: Array<{ genre: string; count: number }>
  resultCount: number
  onPatch: (patch: Partial<SeasonSearch>) => void
  onClose: () => void
}

/**
 * Mobile bottom sheet holding every facet the compact toolbar hides:
 * format, sort + direction, genre, 16+, and view mode. Patches apply
 * immediately (the grid updates behind the sheet); the footer just closes.
 */
export function FilterSheet({
  filters,
  genreOptions,
  resultCount,
  onPatch,
  onClose,
}: FilterSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Esc, scroll-lock, focus-trap, and focus-restore — see useDialog.
  useDialog(containerRef, onClose, closeRef)

  const dir = filters.dir

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Filter dan urutan"
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm"
      />

      <div
        ref={containerRef}
        className="animate-sheet-up relative flex max-h-[85dvh] w-full flex-col rounded-t-2xl bg-surface ring-1 ring-border"
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-base font-bold text-ink">Filter &amp; urutan</h2>
          <div className="flex items-center gap-1">
            {hasActiveFilters(filters) ? (
              <button
                type="button"
                onClick={() => onPatch(RESET_PATCH)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              >
                Reset
              </button>
            ) : null}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="grid h-8 w-8 place-items-center rounded-full text-ink-muted transition hover:bg-white/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-1">
          <Section label="Format">
            <FormatTabs
              fluid
              value={filters.format}
              onChange={(format) => onPatch({ format })}
            />
          </Section>

          <Section label="Urutkan">
            <div className="flex flex-col gap-0.5">
              {SORT_KEYS.map((key) => {
                const active = key === filters.sort
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onPatch({ sort: key, dir: undefined })}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
                      active
                        ? 'bg-accent-soft font-medium text-ink'
                        : 'text-ink-muted hover:bg-white/5 hover:text-ink'
                    }`}
                  >
                    {SORT_LABELS[key]}
                    {active ? (
                      <Check aria-hidden className="h-4 w-4 text-accent" />
                    ) : null}
                  </button>
                )
              })}
            </div>
            <div
              role="group"
              aria-label="Arah urutan"
              className="mt-2 flex items-center gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-border"
            >
              {(
                [
                  {
                    value: 'desc',
                    label: 'Menurun',
                    Icon: ArrowDownWideNarrow,
                  },
                  { value: 'asc', label: 'Menaik', Icon: ArrowUpNarrowWide },
                ] as Array<{
                  value: SortDir
                  label: string
                  Icon: typeof ArrowDownWideNarrow
                }>
              ).map(({ value, label, Icon }) => {
                const active = dir === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onPatch({
                        dir:
                          value === NATURAL_DIR[filters.sort]
                            ? undefined
                            : value,
                      })
                    }
                    className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
                      active
                        ? 'bg-accent-strong text-accent-ink shadow-sm'
                        : 'text-ink-muted hover:bg-white/5 hover:text-ink'
                    }`}
                  >
                    <Icon aria-hidden className="h-4 w-4" />
                    {label}
                  </button>
                )
              })}
            </div>
          </Section>

          <Section label="Genre">
            <GenreList
              options={genreOptions}
              selected={filters.genres}
              onToggle={(genre) =>
                onPatch({ genre: withGenreToggled(filters, genre) })
              }
            />
            <div className="mt-1.5 border-t border-border pt-1.5">
              <AdultToggleRow
                checked={filters.includeAdult}
                onChange={(includeAdult) =>
                  onPatch({ includeAdult: includeAdult || undefined })
                }
              />
            </div>
          </Section>

          <Section label="Tampilan">
            <ViewToggle
              fluid
              view={filters.view}
              onChange={(view) => onPatch({ view })}
            />
          </Section>
        </div>

        <div className="border-t border-border px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-accent-strong py-2.5 text-sm font-semibold text-accent-ink transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          >
            Tampilkan {resultCount} judul
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <section>
      <p className="mb-2 text-xs font-semibold text-ink-subtle">{label}</p>
      {children}
    </section>
  )
}
