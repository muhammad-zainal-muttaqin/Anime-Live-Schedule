import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

export function SeasonYearPicker({ season, year }: SeasonYearPickerProps) {
  const navigate = useNavigate()
  const years = getYearList()
  const prev = shiftSeason(season, year, -1)
  const next = shiftSeason(season, year, 1)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Season tabs */}
      <div
        role="tablist"
        aria-label="Pilih musim"
        className="flex items-center gap-1 overflow-x-auto rounded-xl bg-zinc-900/60 p-1 ring-1 ring-white/10"
      >
        {SEASONS.map((s) => {
          const active = s === season
          return (
            <Link
              key={s}
              to="/$season/$year"
              params={{ season: s, year: String(year) }}
              role="tab"
              aria-selected={active}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
              }`}
            >
              <span aria-hidden>{SEASON_EMOJI[s]}</span>
              {SEASON_LABELS[s]}
            </Link>
          )
        })}
      </div>

      {/* Year + prev/next season nav */}
      <div className="flex items-center gap-2">
        <Link
          to="/$season/$year"
          params={{ season: prev.season, year: String(prev.year) }}
          aria-label="Musim sebelumnya"
          className="rounded-lg bg-zinc-900/60 p-2 text-zinc-400 ring-1 ring-white/10 transition hover:text-zinc-100 hover:ring-white/20"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

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
            })
          }
          className="rounded-lg bg-zinc-900/60 px-3 py-2 text-sm font-medium text-zinc-100 ring-1 ring-white/10 transition hover:ring-white/20 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {years.map((y) => (
            <option key={y} value={y} className="bg-zinc-900">
              {y}
            </option>
          ))}
        </select>

        <Link
          to="/$season/$year"
          params={{ season: next.season, year: String(next.year) }}
          aria-label="Musim berikutnya"
          className="rounded-lg bg-zinc-900/60 p-2 text-zinc-400 ring-1 ring-white/10 transition hover:text-zinc-100 hover:ring-white/20"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
