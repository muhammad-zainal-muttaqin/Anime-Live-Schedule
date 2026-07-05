import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AnimeDetailModal } from '#/components/AnimeDetailModal'
import { animeDetailQueryOptions } from '#/lib/queries'
import { getSeasonalAnime } from '#/server/anilist'
import { pickTitle } from '#/lib/format'
import { isSeason, SEASON_LABELS, type Season } from '#/lib/anilist/season'
import type { AnimeMedia } from '#/lib/anilist/types'

export const Route = createFileRoute('/$season/$year/$id')({
  loader: async ({ params }): Promise<{ anime: AnimeMedia | null; seasonLabel: string }> => {
    const season = isSeason(params.season) ? (params.season as Season) : 'summer'
    const year = Number(params.year)
    const id = Number(params.id)
    try {
      const seasonal = await getSeasonalAnime({ data: { season, year } })
      const anime = seasonal.media.find((m) => m.id === id) ?? null
      return { anime, seasonLabel: `${SEASON_LABELS[season]} ${year}` }
    } catch {
      return { anime: null, seasonLabel: `${SEASON_LABELS[season]} ${year}` }
    }
  },
  head: ({ params, loaderData }) => {
    const anime = loaderData?.anime
    const seasonLabel = loaderData?.seasonLabel ?? ''
    const title = anime ? pickTitle(anime.title) : `Anime #${params.id}`
    const description = anime?.description
      ? anime.description
      : `Detail anime dari ${seasonLabel} — lihat informasi lengkap, sinopsis, skor, genre, studio, dan jadwal episode.`
    const image = anime?.coverImage?.extraLarge ?? anime?.coverImage?.large ?? undefined
    return {
      meta: [
        { title: `${title} — AnimeSeasons` },
        { name: 'description', content: description },
        { property: 'og:title', content: `${title} — AnimeSeasons (${seasonLabel})` },
        { property: 'og:description', content: description },
        ...(image ? [{ property: 'og:image' as const, content: image }] : []),
      ],
    }
  },
  component: DetailRoute,
})

function useCloseModal() {
  const params = Route.useParams()
  const navigate = useNavigate()
  return () =>
    navigate({
      to: '/$season/$year',
      params: { season: params.season, year: params.year },
      search: (prev) => prev,
    })
}

function DetailRoute() {
  const params = Route.useParams()
  const close = useCloseModal()
  // Fetch only in the browser: AniList blocks the Cloudflare Worker, so SSR
  // (including deep-links) must not try to fetch it.
  const { data, error, isPending } = useQuery({
    ...animeDetailQueryOptions(Number(params.id)),
    enabled: typeof window !== 'undefined',
  })

  if (error) return <DetailError error={error as Error} />
  if (isPending || !data) return <DetailPending />
  return <AnimeDetailModal detail={data} onClose={close} />
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm"
      />
      <div className="animate-sheet-up relative max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-t-2xl bg-surface ring-1 ring-border sm:animate-pop-in sm:rounded-2xl">
        {children}
      </div>
    </div>
  )
}

function DetailPending() {
  const close = useCloseModal()
  return (
    <ModalShell onClose={close}>
      <div className="h-36 animate-pulse bg-surface-2 sm:h-48" />
      <div className="px-5 pb-6 sm:px-6">
        <div className="-mt-16 flex gap-4">
          <div className="h-40 w-28 shrink-0 animate-pulse rounded-lg bg-elevated" />
          <div className="flex-1 space-y-2 pt-16">
            <div className="h-5 w-2/3 animate-pulse rounded bg-surface-2" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface" />
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-surface-2" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-surface-2" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-surface-2" />
        </div>
      </div>
    </ModalShell>
  )
}

function DetailError({ error }: { error: Error }) {
  const close = useCloseModal()
  console.error('DetailError', error)
  return (
    <ModalShell onClose={close}>
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-2xl ring-1 ring-border">
          ⚠️
        </span>
        <p className="text-lg font-semibold text-ink">Gagal memuat detail</p>
        <p className="max-w-sm text-sm text-ink-subtle">Coba refresh halaman atau tunggu beberapa saat.</p>
        <button
          type="button"
          onClick={close}
          className="mt-1 rounded-lg bg-accent-strong px-4 py-2 text-sm font-semibold text-accent-ink transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
        >
          Tutup
        </button>
      </div>
    </ModalShell>
  )
}
