import { useMemo } from 'react'
import { Link, Outlet, createFileRoute, redirect, stripSearchParams, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { SearchX, Tv, X } from 'lucide-react'
import { AnimeCard } from '#/components/AnimeCard'
import { AnimeListRow } from '#/components/AnimeListRow'
import { FilterBar } from '#/components/filters/FilterBar'
import { FORMAT_BUCKET_LABELS } from '#/components/filters/FormatTabs'
import {
  SEASON_EMOJI,
  SEASON_LABELS,
  getCurrentSeason,
  isSeason,
  type Season,
} from '#/lib/anilist/season'
import {
  FILTER_DEFAULTS,
  RESET_PATCH,
  applyFilters,
  deriveGenreCounts,
  hasActiveFilters,
  parseSearch,
  resolveFilters,
  withGenreToggled,
  type SeasonSearch,
} from '#/lib/filter'
import { SeasonYearPicker } from '#/components/SeasonYearPicker'
import { seasonalQueryOptions } from '#/lib/queries'

export const Route = createFileRoute('/$season/$year')({
  validateSearch: parseSearch,
  search: { middlewares: [stripSearchParams(FILTER_DEFAULTS)] },
  loader: async ({ context, params }) => {
    const year = Number(params.year)
    if (!isSeason(params.season) || !Number.isInteger(year) || year < 1940 || year > 2100) {
      const current = getCurrentSeason()
      throw redirect({
        to: '/$season/$year',
        params: { season: current.season, year: String(current.year) },
      })
    }
    await context.queryClient.ensureQueryData(seasonalQueryOptions(params.season, year))
  },
  pendingComponent: SeasonPending,
  errorComponent: SeasonError,
  component: SeasonPage,
})

const GRID = 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
const CONTAINER = 'mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8'

function useRouteSeason(): { season: Season | undefined; year: string } {
  const params = Route.useParams()
  return { season: isSeason(params.season) ? params.season : undefined, year: params.year }
}

/** Shared frame: season-scoped ambient + brand + sticky season switcher. */
function PageShell({
  season,
  year,
  children,
}: {
  season: Season | undefined
  year: string
  children: React.ReactNode
}) {
  return (
    <div className="season-ambient min-h-screen" data-season={season}>
      <div className={`${CONTAINER} pt-6`}>
        <header className="flex items-center gap-3">
          <Link
            to="/"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-strong text-accent-ink shadow-lg shadow-black/30 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            aria-label="Beranda"
          >
            <Tv className="h-5 w-5" />
          </Link>
          <Link to="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring rounded">
            <h1 className="text-lg font-bold tracking-tight text-ink">AnimeSeasons</h1>
            <p className="text-xs text-ink-subtle">Jadwal tayang anime per musim · data AniList</p>
          </Link>
        </header>
      </div>

      <div className="sticky top-0 z-30 mt-5 border-y border-border bg-canvas/75 backdrop-blur-md">
        <div className={`${CONTAINER} py-3`}>
          {season ? <SeasonYearPicker season={season} year={Number(year)} /> : null}
        </div>
      </div>

      <div className={`${CONTAINER} py-6`}>{children}</div>
    </div>
  )
}

function SeasonPage() {
  const { season, year } = useRouteSeason()
  const s = season as Season
  const numericYear = Number(year)
  const { data } = useSuspenseQuery(seasonalQueryOptions(s, numericYear))
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const filters = useMemo(() => resolveFilters(search), [search])
  const filtered = useMemo(() => applyFilters(data.media, filters), [data.media, filters])
  // Facet options reflect the other active filters, but not the genre picks
  // themselves — so a checked genre never erases its own siblings.
  const genreOptions = useMemo(
    () => deriveGenreCounts(applyFilters(data.media, { ...filters, genres: [] })),
    [data.media, filters],
  )

  const onPatch = (patch: Partial<SeasonSearch>) =>
    navigate({
      search: (prev) => ({ ...prev, ...patch }),
      replace: true,
      resetScroll: false,
    })

  const filtering = hasActiveFilters(filters)

  return (
    <PageShell season={season} year={year}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink">
          <span aria-hidden className="text-xl">{SEASON_EMOJI[s]}</span>
          {SEASON_LABELS[s]} {numericYear}
        </h2>
        <p aria-live="polite" className="text-sm text-ink-subtle">
          {filtering ? (
            <>
              <span className="font-semibold text-ink-muted tabular-nums">{filtered.length}</span>
              {' dari '}
              <span className="tabular-nums">{data.media.length}</span> judul
            </>
          ) : (
            <>
              <span className="font-semibold text-ink-muted tabular-nums">{data.media.length}</span>{' '}
              judul
            </>
          )}
        </p>
      </div>

      {data.media.length > 0 ? (
        <div className="mt-4">
          <FilterBar filters={filters} genreOptions={genreOptions} onPatch={onPatch} />
          {filtering ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {filters.q ? (
                <FilterChip label={`“${filters.q}”`} onRemove={() => onPatch({ q: '' })} />
              ) : null}
              {filters.format !== 'all' ? (
                <FilterChip
                  label={FORMAT_BUCKET_LABELS[filters.format]}
                  onRemove={() => onPatch({ format: 'all' })}
                />
              ) : null}
              {filters.genres.map((genre) => (
                <FilterChip
                  key={genre}
                  label={genre}
                  onRemove={() => onPatch({ genre: withGenreToggled(filters, genre) })}
                />
              ))}
              <button
                type="button"
                onClick={() => onPatch(RESET_PATCH)}
                className="rounded-full px-2.5 py-1 text-xs font-medium text-ink-subtle transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              >
                Reset filter
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {data.media.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <NoResultsState onReset={() => onPatch(RESET_PATCH)} />
      ) : filters.view === 'list' ? (
        <div key="list" className="animate-fade-in mt-4 flex flex-col divide-y divide-border">
          {filtered.map((anime) => (
            <AnimeListRow key={anime.id} anime={anime} season={s} year={year} />
          ))}
        </div>
      ) : (
        <div key="grid" className={`animate-fade-in mt-5 ${GRID}`}>
          {filtered.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} season={s} year={year} />
          ))}
        </div>
      )}

      {/* Detail modal renders here when the URL has an /$id segment. */}
      <Outlet />
    </PageShell>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Hapus filter ${label}`}
      className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent ring-1 ring-accent-line transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
    >
      {label}
      <X aria-hidden className="h-3 w-3" />
    </button>
  )
}

function EmptyState() {
  return (
    <div className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-2 text-center">
      <span className="mb-1 grid h-12 w-12 place-items-center rounded-2xl bg-surface text-2xl ring-1 ring-border">
        📭
      </span>
      <p className="text-lg font-semibold text-ink">Belum ada judul untuk musim ini</p>
      <p className="text-sm text-pretty text-ink-subtle">
        Coba pilih musim atau tahun lain — data untuk musim mendatang biasanya muncul beberapa
        bulan sebelum tayang.
      </p>
    </div>
  )
}

function NoResultsState({ onReset }: { onReset: () => void }) {
  return (
    <div className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-2 text-center">
      <span className="mb-1 grid h-12 w-12 place-items-center rounded-2xl bg-surface ring-1 ring-border">
        <SearchX aria-hidden className="h-6 w-6 text-ink-subtle" />
      </span>
      <p className="text-lg font-semibold text-ink">Tidak ada judul yang cocok</p>
      <p className="text-sm text-pretty text-ink-subtle">
        Coba ubah kata kunci atau kurangi filter yang aktif.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-2 rounded-lg bg-accent-strong px-4 py-2 text-sm font-semibold text-accent-ink transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
      >
        Reset filter
      </button>
    </div>
  )
}

function SeasonPending() {
  const { season, year } = useRouteSeason()
  return (
    <PageShell season={season} year={year}>
      <div className="flex items-baseline justify-between gap-4">
        <div className="h-8 w-52 animate-pulse rounded-lg bg-surface" />
        <div className="h-4 w-16 animate-pulse rounded bg-surface" />
      </div>
      {/* Toolbar placeholder mirrors the FilterBar footprint. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="h-9 w-64 animate-pulse rounded-xl bg-surface" />
        <div className="hidden h-9 flex-1 animate-pulse rounded-lg bg-surface sm:block" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-surface" />
        <div className="h-9 w-36 animate-pulse rounded-lg bg-surface" />
        <div className="h-9 w-20 animate-pulse rounded-xl bg-surface" />
      </div>
      <div className={`mt-5 ${GRID}`}>
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[2/3] animate-pulse rounded-2xl bg-surface-2" />
            <div className="mt-2 h-3.5 w-4/5 animate-pulse rounded bg-surface-2" />
            <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-surface" />
          </div>
        ))}
      </div>
    </PageShell>
  )
}

function SeasonError({ error }: { error: Error }) {
  const { season, year } = useRouteSeason()
  const router = useRouter()
  return (
    <PageShell season={season} year={year}>
      <div className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-3 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface text-2xl ring-1 ring-border">
          ⚠️
        </span>
        <p className="text-lg font-semibold text-ink">Gagal memuat data dari AniList</p>
        <p className="text-sm text-ink-subtle">{error.message}</p>
        <button
          type="button"
          onClick={() => router.invalidate()}
          className="mt-1 rounded-lg bg-accent-strong px-4 py-2 text-sm font-semibold text-accent-ink transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
        >
          Coba lagi
        </button>
      </div>
    </PageShell>
  )
}
