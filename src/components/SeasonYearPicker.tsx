import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Select } from '#/components/filters/Select'
import {
  SEASONS,
  SEASON_EMOJI,
  SEASON_LABELS,
  getYearList,
  shiftSeason,
} from '#/lib/anilist/season'
import type { Season } from '#/lib/anilist/season'

interface SeasonYearPickerProps {
  season: Season
  year: number
}

const navBtn =
  'grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-ink-muted ring-1 ring-border transition hover:text-ink hover:ring-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring'

export function SeasonYearPicker({ season, year }: SeasonYearPickerProps) {
  const navigate = useNavigate()
  const yearOptions = getYearList().map((y) => ({ value: y, label: String(y) }))
  const prev = shiftSeason(season, year, -1)
  const next = shiftSeason(season, year, 1)

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3">
      {/* Season segmented control. Never scrolls: below xs every tab is
          emoji-only (the H1 right under it repeats the season name), from xs
          the active tab's label expands via an animated 0fr->1fr grid column,
          and from sm every label shows. */}
      <div
        role="tablist"
        aria-label="Pilih musim"
        className="flex min-w-0 items-center gap-0.5 rounded-xl bg-surface p-1 ring-1 ring-border sm:gap-1"
      >
        {SEASONS.map((s) => {
          const active = s === season
          return (
            <Link
              key={s}
              to="/$season/$year"
              params={{ season: s, year: String(year) }}
              search={(prevSearch) => prevSearch}
              role="tab"
              aria-selected={active}
              aria-label={SEASON_LABELS[s]}
              data-season={s}
              className={`flex items-center rounded-lg px-2 py-1.5 text-sm font-medium transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring sm:px-3 ${
                active
                  ? 'bg-accent-strong text-accent-ink shadow-sm'
                  : 'text-ink-muted hover:bg-white/5 hover:text-ink'
              }`}
            >
              <span aria-hidden className="text-[0.95em] leading-none">
                {SEASON_EMOJI[s]}
              </span>
              {/* Animated width: the grid column tweens between 0fr and 1fr,
                  so no layout property is animated directly. The label's
                  leading gap lives on the innermost span so the clipped
                  column truly collapses to 0 (padding on the clipping span
                  itself would survive as phantom width). */}
              <span
                className={`grid min-w-0 grid-cols-[0fr] transition-[grid-template-columns] duration-300 ease-out-expo sm:grid-cols-[1fr] ${
                  active ? 'xs:grid-cols-[1fr]' : ''
                }`}
              >
                <span
                  className={`min-w-0 overflow-hidden opacity-0 transition-opacity duration-200 sm:opacity-100 ${
                    active ? 'xs:opacity-100' : ''
                  }`}
                >
                  <span className="block whitespace-nowrap ps-1.5">
                    {SEASON_LABELS[s]}
                  </span>
                </span>
              </span>
            </Link>
          )
        })}
      </div>

      {/* Year select + prev/next season nav */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Link
          to="/$season/$year"
          params={{ season: prev.season, year: String(prev.year) }}
          search={(prevSearch) => prevSearch}
          aria-label={`Musim sebelumnya: ${SEASON_LABELS[prev.season]} ${prev.year}`}
          className={navBtn}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        <Select
          label="Pilih tahun"
          value={year}
          options={yearOptions}
          onChange={(y) =>
            navigate({
              to: '/$season/$year',
              params: { season, year: String(y) },
              search: (prevSearch) => prevSearch,
            })
          }
          buttonClassName="font-semibold tabular-nums"
          panelClassName="tabular-nums"
        />

        <Link
          to="/$season/$year"
          params={{ season: next.season, year: String(next.year) }}
          search={(prevSearch) => prevSearch}
          aria-label={`Musim berikutnya: ${SEASON_LABELS[next.season]} ${next.year}`}
          className={navBtn}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
