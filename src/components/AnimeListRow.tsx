import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import { Star } from 'lucide-react'
import type { AnimeMedia } from '#/lib/anilist/types'
import {
  formatEpsDuration,
  formatFormat,
  formatFuzzyDate,
  formatScore,
  formatSource,
  formatStatus,
  pickTitle,
  STATUS_TONE,
} from '#/lib/format'
import { Countdown } from '#/components/Countdown'

interface AnimeListRowProps {
  anime: AnimeMedia
  season: string
  year: string
}

const MAX_GENRE_CHIPS = 4

/** LiveChart-style detailed row for the list view. The whole row is a link. */
export const AnimeListRow = memo(function AnimeListRow({
  anime,
  season,
  year,
}: AnimeListRowProps) {
  const title = pickTitle(anime.title)
  const score = formatScore(anime.averageScore)
  const cover =
    anime.coverImage.large ?? anime.coverImage.extraLarge ?? undefined
  const airing = anime.nextAiringEpisode

  const meta = [
    anime.studios.nodes[0]?.name,
    anime.format && anime.format !== 'TV' ? formatFormat(anime.format) : null,
    formatSource(anime.source),
    formatEpsDuration(anime.episodes, anime.duration),
    formatFuzzyDate(anime.startDate),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Link
      to="/$season/$year/$id"
      params={{ season, year, id: String(anime.id) }}
      search={(prev) => prev}
      aria-label={title}
      className="group flex gap-4 rounded-xl px-2 py-4 transition hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring sm:px-3"
    >
      <div
        className="relative aspect-[2/3] w-20 shrink-0 self-start overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border transition group-hover:ring-accent-line sm:w-24"
        style={
          anime.coverImage.color
            ? { backgroundColor: anime.coverImage.color }
            : undefined
        }
      >
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 font-semibold leading-snug text-ink transition-colors group-hover:text-accent">
          {title}
        </h3>
        {meta ? (
          <p className="mt-1 line-clamp-1 text-xs text-ink-subtle">{meta}</p>
        ) : null}

        {anime.genres.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1">
            {anime.genres.slice(0, MAX_GENRE_CHIPS).map((genre) => (
              <li
                key={genre}
                className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-muted ring-1 ring-border"
              >
                {genre}
              </li>
            ))}
          </ul>
        ) : null}

        {anime.description ? (
          <p className="mt-2 hidden max-w-[68ch] text-sm leading-relaxed text-ink-muted sm:line-clamp-2">
            {anime.description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
        {score ? (
          <span className="flex items-center gap-1 text-sm font-semibold text-amber-300 tabular-nums">
            <Star aria-hidden className="h-3.5 w-3.5 fill-amber-300" />
            {score}
          </span>
        ) : null}
        {airing ? (
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent ring-1 ring-accent-line tabular-nums">
            EP {airing.episode} · <Countdown airingAt={airing.airingAt} />
          </span>
        ) : anime.status ? (
          <span className="flex items-center gap-1.5 text-xs text-ink-subtle">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${STATUS_TONE[anime.status] ?? 'bg-slate-400'}`}
            />
            {formatStatus(anime.status)}
          </span>
        ) : null}
      </div>
    </Link>
  )
})
