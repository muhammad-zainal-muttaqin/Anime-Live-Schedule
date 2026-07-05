import { Outlet, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Tv } from 'lucide-react'
import { AnimeCard } from '#/components/AnimeCard'
import { SeasonYearPicker } from '#/components/SeasonYearPicker'
import {
  SEASON_LABELS,
  getCurrentSeason,
  isSeason,
  type Season,
} from '#/lib/anilist/season'
import { seasonalQueryOptions } from '#/lib/queries'

export const Route = createFileRoute('/$season/$year')({
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

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600/90 text-white shadow-lg shadow-brand-600/20">
          <Tv className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">AnimeSeasons</h1>
          <p className="text-xs text-zinc-500">Jadwal tayang anime per musim · data AniList</p>
        </div>
      </header>
      {children}
    </div>
  )
}

function SeasonPage() {
  const params = Route.useParams()
  const season = params.season as Season
  const year = Number(params.year)
  const { data } = useSuspenseQuery(seasonalQueryOptions(season, year))

  return (
    <PageShell>
      <div className="mt-6">
        <SeasonYearPicker season={season} year={year} />
      </div>

      <p className="mt-5 text-sm text-zinc-500">
        <span className="font-semibold text-zinc-300">{data.media.length}</span> judul ·{' '}
        {SEASON_LABELS[season]} {year}
      </p>

      {data.media.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {data.media.map((anime) => (
            <AnimeCard
              key={anime.id}
              anime={anime}
              season={params.season}
              year={params.year}
            />
          ))}
        </div>
      )}

      {/* Detail modal renders here when the URL has an /$id segment. */}
      <Outlet />
    </PageShell>
  )
}

function EmptyState() {
  return (
    <div className="mt-16 flex flex-col items-center gap-2 text-center">
      <p className="text-lg font-medium text-zinc-300">Belum ada judul untuk musim ini</p>
      <p className="text-sm text-zinc-500">
        Coba pilih musim atau tahun lain — data untuk musim mendatang biasanya muncul beberapa
        bulan sebelum tayang.
      </p>
    </div>
  )
}

function SeasonPending() {
  return (
    <PageShell>
      <div className="mt-6 h-10 w-full max-w-md animate-pulse rounded-xl bg-zinc-900/60" />
      <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[2/3] animate-pulse rounded-xl bg-zinc-800/80" />
            <div className="mt-2 h-3.5 w-4/5 animate-pulse rounded bg-zinc-800/80" />
            <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-zinc-800/60" />
          </div>
        ))}
      </div>
    </PageShell>
  )
}

function SeasonError({ error }: { error: Error }) {
  const router = useRouter()
  return (
    <PageShell>
      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <p className="text-lg font-medium text-zinc-200">Gagal memuat data dari AniList</p>
        <p className="max-w-md text-sm text-zinc-500">{error.message}</p>
        <button
          type="button"
          onClick={() => router.invalidate()}
          className="mt-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500"
        >
          Coba lagi
        </button>
      </div>
    </PageShell>
  )
}
