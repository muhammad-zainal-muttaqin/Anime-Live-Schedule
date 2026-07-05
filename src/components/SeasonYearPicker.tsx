import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  SEASONS,
  SEASON_EMOJI,
  SEASON_LABELS,
  getYearList,
  shiftSeason,
  type Season,
} from '#/lib/anilist/season'

interface SeasonYearPickerProps {
  season: Season
  year: number
}

const navBtn =
  'grid h-9 w-9 place-items-center rounded-lg bg-surface text-ink-muted ring-1 ring-border transition hover:text-ink hover:ring-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring'

export function SeasonYearPicker({ season, year }: SeasonYearPickerProps) {
  const navigate = useNavigate()
  const years = getYearList()
  const prev = shiftSeason(season, year, -1)
  const next = shiftSeason(season, year, 1)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Season segmented control */}
      <div
        role="tablist"
        aria-label="Pilih musim"
        className="flex items-center gap-1 overflow-x-auto rounded-xl bg-surface p-1 ring-1 ring-border"
      >
        {SEASONS.map((s) => {
          const active = s === season
          return (
            <Link
              key={s}
              to="/$season/$year"
              params={{ season: s, year: String(year) }}
              search={(prev) => prev}
              role="tab"
              aria-selected={active}
              data-season={s}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
                active
                  ? 'bg-accent-strong text-accent-ink shadow-sm'
                  : 'text-ink-muted hover:bg-white/5 hover:text-ink'
              }`}
            >
              <span aria-hidden className="text-[0.95em] leading-none">
                {SEASON_EMOJI[s]}
              </span>
              {SEASON_LABELS[s]}
            </Link>
          )
        })}
      </div>

      {/* Year select + prev/next season nav */}
      <div className="flex items-center gap-2">
        <Link
          to="/$season/$year"
          params={{ season: prev.season, year: String(prev.year) }}
          search={(prevSearch) => prevSearch}
          aria-label={`Musim sebelumnya: ${SEASON_LABELS[prev.season]} ${prev.year}`}
          className={navBtn}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        <div className="relative">
          <label className="sr-only" htmlFor="year-select">
            Pilih tahun
          </label>
          <select
            id="year-select"
            value={year}
            onChange={(e) =>
              navigate({
                to: '/$season/$year',
                params: { season, year: e.target.value },
                search: (prevSearch) => prevSearch,
              })
            }
            className="h-9 appearance-none rounded-lg bg-surface pl-3 pr-9 text-sm font-semibold text-ink tabular-nums ring-1 ring-border transition hover:ring-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-elevated text-ink">
                {y}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
          />
        </div>

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
