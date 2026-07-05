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
      {/* Season segmented control. Below sm the inactive tabs collapse to
          their emoji so the whole picker fits one row. */}
      <div
        role="tablist"
        aria-label="Pilih musim"
        className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl bg-surface p-1 ring-1 ring-border"
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
              className={`flex shrink-0 items-center gap-1.5 rounded-lg py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
                active
                  ? 'bg-accent-strong px-3 text-accent-ink shadow-sm'
                  : 'px-2.5 text-ink-muted hover:bg-white/5 hover:text-ink sm:px-3'
              }`}
            >
              <span aria-hidden className="text-[0.95em] leading-none">
                {SEASON_EMOJI[s]}
              </span>
              <span className={active ? undefined : 'hidden sm:inline'}>
                {SEASON_LABELS[s]}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Year select + prev/next season nav */}
      <div className="flex shrink-0 items-center gap-2">
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
