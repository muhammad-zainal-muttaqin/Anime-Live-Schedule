import { useEffect, useRef } from 'react'
import { CalendarClock, ExternalLink, Star, X } from 'lucide-react'
import type { AnimeDetail } from '#/lib/anilist/types'
import {
  formatFormat,
  formatFuzzyDate,
  formatScore,
  formatStatus,
  formatTimeUntil,
  pickTitle,
  secondaryTitle,
  STATUS_TONE,
  stripHtml,
} from '#/lib/format'

interface AnimeDetailModalProps {
  detail: AnimeDetail
  onClose: () => void
}

export function AnimeDetailModal({ detail, onClose }: AnimeDetailModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const title = pickTitle(detail.title)
  const secondary = secondaryTitle(detail.title)
  const score = formatScore(detail.averageScore)
  const cover = detail.coverImage.extraLarge ?? detail.coverImage.large ?? undefined
  const description = stripHtml(detail.description)
  const airing = detail.nextAiringEpisode
  const studios = detail.studios.nodes.map((s) => s.name).join(', ')
  const startDate = formatFuzzyDate(detail.startDate)
  const streamingLinks = detail.externalLinks.filter((l) => l.type === 'STREAMING')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm animate-fade-in"
      />

      <div className="animate-pop-in relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-zinc-900 ring-1 ring-white/10 sm:rounded-2xl">
        {/* Banner */}
        <div className="relative h-36 bg-zinc-800 sm:h-48">
          {detail.bannerImage ? (
            <img src={detail.bannerImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-brand-600/40 to-zinc-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-zinc-200 backdrop-blur-sm transition hover:bg-black/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-6 sm:px-6">
          {/* Poster + title */}
          <div className="-mt-16 flex gap-4">
            {cover ? (
              <img
                src={cover}
                alt=""
                className="h-40 w-28 shrink-0 rounded-lg object-cover shadow-xl ring-1 ring-white/10"
              />
            ) : null}
            <div className="min-w-0 pt-16">
              <h2 className="text-xl font-bold leading-tight text-white">{title}</h2>
              {secondary ? <p className="mt-0.5 text-sm text-zinc-400">{secondary}</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${STATUS_TONE[detail.status ?? ''] ?? 'bg-zinc-500'}`}
                  />
                  {formatStatus(detail.status)}
                </span>
                <span aria-hidden>·</span>
                <span>{formatFormat(detail.format)}</span>
                {detail.episodes ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{detail.episodes} eps</span>
                  </>
                ) : null}
                {score ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <Star className="h-3 w-3 fill-amber-300" />
                      {score}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Next episode countdown */}
          {airing ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-brand-600/15 px-3 py-2 text-sm text-brand-200 ring-1 ring-brand-500/20">
              <CalendarClock className="h-4 w-4" />
              Episode {airing.episode} tayang dalam{' '}
              <span className="font-semibold tabular-nums">{formatTimeUntil(airing.airingAt)}</span>
            </div>
          ) : null}

          {/* Genres */}
          {detail.genres.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {detail.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-zinc-300 ring-1 ring-white/10"
                >
                  {g}
                </span>
              ))}
            </div>
          ) : null}

          {/* Description */}
          {description ? (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
              {description}
            </p>
          ) : null}

          {/* Meta grid */}
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <Meta label="Studio" value={studios || null} />
            <Meta label="Mulai tayang" value={startDate} />
            <Meta label="Durasi" value={detail.duration ? `${detail.duration} min` : null} />
          </dl>

          {/* Streaming + AniList links */}
          <div className="mt-5 flex flex-wrap gap-2">
            {streamingLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
                style={link.color ? { borderColor: link.color } : undefined}
              >
                {link.site}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
            {detail.siteUrl ? (
              <a
                href={detail.siteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-500"
              >
                Lihat di AniList
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-200">{value}</dd>
    </div>
  )
}
