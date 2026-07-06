import { useMemo, useRef } from 'react'
import { CalendarClock, ExternalLink, Star, X } from 'lucide-react'
import type { AnimeDetail } from '#/lib/anilist/types'
import {
  formatFormat,
  formatFuzzyDate,
  formatScore,
  formatStatus,
  pickTitle,
  secondaryTitle,
  STATUS_TONE,
  stripHtml,
} from '#/lib/format'
import { useDialog } from '#/lib/hooks'
import { Countdown } from '#/components/Countdown'

interface AnimeDetailModalProps {
  detail: AnimeDetail
  onClose: () => void
}

export function AnimeDetailModal({ detail, onClose }: AnimeDetailModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const jsonLd = useMemo(
    () =>
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'TVSeries',
        name: pickTitle(detail.title),
        description: stripHtml(detail.description).slice(0, 500),
        image: detail.coverImage.extraLarge ?? detail.coverImage.large,
        genre: detail.genres,
        datePublished: detail.startDate.year
          ? `${detail.startDate.year}${detail.startDate.month ? `-${String(detail.startDate.month).padStart(2, '0')}` : ''}${detail.startDate.day ? `-${String(detail.startDate.day).padStart(2, '0')}` : ''}`
          : undefined,
        aggregateRating: detail.averageScore
          ? {
              '@type': 'AggregateRating',
              ratingValue: (detail.averageScore / 10).toFixed(1),
              bestRating: '10',
              worstRating: '0',
              ratingCount: detail.popularity ?? 1,
            }
          : undefined,
        ...(detail.studios.nodes[0]
          ? { productionCompany: detail.studios.nodes[0].name }
          : {}),
      }).replace(/</g, '\\u003C'),
    [detail],
  )

  // Esc, scroll-lock, focus-trap, and focus-restore — see useDialog.
  useDialog(containerRef, onClose, closeRef)

  const title = pickTitle(detail.title)
  const secondary = secondaryTitle(detail.title)
  const score = formatScore(detail.averageScore)
  const cover =
    detail.coverImage.extraLarge ?? detail.coverImage.large ?? undefined
  const description = stripHtml(detail.description)
  const airing = detail.nextAiringEpisode
  const studios = detail.studios.nodes.map((s) => s.name).join(', ')
  const startDate = formatFuzzyDate(detail.startDate)
  const streamingLinks = detail.externalLinks.filter(
    (l) => l.type === 'STREAMING',
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm"
      />

      <div
        ref={containerRef}
        className="animate-sheet-up relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-surface ring-1 ring-border sm:animate-pop-in sm:rounded-2xl"
      >
        {/* Banner */}
        <div className="relative h-36 bg-surface-2 sm:h-48">
          {detail.bannerImage ? (
            <img
              src={detail.bannerImage}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-accent-soft to-surface-2" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/45 to-transparent" />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-zinc-100 backdrop-blur-sm transition hover:bg-black/75 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
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
                className="h-40 w-28 shrink-0 rounded-lg object-cover shadow-xl ring-1 ring-border"
              />
            ) : null}
            <div className="min-w-0 pt-16">
              <h2 className="text-xl font-bold leading-tight text-ink">
                {title}
              </h2>
              {secondary ? (
                <p className="mt-0.5 text-sm text-ink-muted">{secondary}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${STATUS_TONE[detail.status ?? ''] ?? 'bg-zinc-500'}`}
                  />
                  {formatStatus(detail.status)}
                </span>
                <span aria-hidden className="text-ink-subtle">
                  ·
                </span>
                <span>{formatFormat(detail.format)}</span>
                {detail.episodes ? (
                  <>
                    <span aria-hidden className="text-ink-subtle">
                      ·
                    </span>
                    <span>{detail.episodes} eps</span>
                  </>
                ) : null}
                {score ? (
                  <>
                    <span aria-hidden className="text-ink-subtle">
                      ·
                    </span>
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
            <div className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent ring-1 ring-accent-line">
              <CalendarClock className="h-4 w-4 shrink-0" />
              <span>Episode {airing.episode} tayang dalam</span>
              <span className="font-semibold tabular-nums text-ink">
                <Countdown airingAt={airing.airingAt} />
              </span>
            </div>
          ) : null}

          {/* Genres */}
          {detail.genres.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {detail.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-muted ring-1 ring-border"
                >
                  {g}
                </span>
              ))}
            </div>
          ) : null}

          {/* Description */}
          {description ? (
            <p className="mt-4 max-w-[68ch] whitespace-pre-line text-sm leading-relaxed text-pretty text-ink-muted">
              {description}
            </p>
          ) : null}

          {/* Meta grid */}
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <Meta label="Studio" value={studios || null} />
            <Meta label="Mulai tayang" value={startDate} />
            <Meta
              label="Durasi"
              value={detail.duration ? `${detail.duration} min` : null}
            />
          </dl>

          {/* Streaming + AniList links */}
          <div className="mt-5 flex flex-wrap gap-2">
            {streamingLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-border transition hover:bg-elevated hover:ring-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              >
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: link.color ?? 'var(--accent)' }}
                />
                {link.site}
                <ExternalLink className="h-3 w-3 text-ink-subtle" />
              </a>
            ))}
            {detail.siteUrl ? (
              <a
                href={detail.siteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-strong px-3 py-1.5 text-xs font-semibold text-accent-ink transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
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
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  )
}
