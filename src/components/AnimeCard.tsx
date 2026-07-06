import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import { Star } from 'lucide-react'
import type { AnimeMedia } from '#/lib/anilist/types'
import { formatFormat, formatScore, pickTitle } from '#/lib/format'
import { Countdown } from '#/components/Countdown'

interface AnimeCardProps {
  anime: AnimeMedia
  season: string
  year: string
}

export const AnimeCard = memo(function AnimeCard({
  anime,
  season,
  year,
}: AnimeCardProps) {
  const title = pickTitle(anime.title)
  const score = formatScore(anime.averageScore)
  // Grid cells are small; `large` is plenty and ~4× lighter than `extraLarge`
  // across 100+ posters. The modal keeps `extraLarge` for its full-size poster.
  const cover =
    anime.coverImage.large ?? anime.coverImage.extraLarge ?? undefined
  const studio = anime.studios.nodes[0]?.name
  const airing = anime.nextAiringEpisode
  // "TV" is the default expectation; only surface the format when it's notable.
  const format =
    anime.format && anime.format !== 'TV' ? formatFormat(anime.format) : null

  return (
    <Link
      to="/$season/$year/$id"
      params={{ season, year, id: String(anime.id) }}
      search={(prev) => prev}
      className="group block rounded-2xl focus:outline-none"
      aria-label={title}
    >
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-border shadow-sm transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-black/40 group-hover:ring-accent-line group-focus-visible:ring-2 group-focus-visible:ring-accent-ring"
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
            className="absolute inset-0 h-full w-full object-cover transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
          />
        ) : null}

        {/* Legibility scrim so badges stay readable over any artwork. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/35" />

        {score ? (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-amber-300 tabular-nums">
            <Star className="h-3 w-3 fill-amber-300" />
            {score}
          </div>
        ) : null}

        {format ? (
          <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-100">
            {format}
          </div>
        ) : null}

        {airing ? (
          <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 rounded-lg bg-accent-strong px-2 py-1 text-[11px] font-semibold text-accent-ink shadow-sm">
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-accent-ink/80"
              />
              EP {airing.episode}
            </span>
            <span className="tabular-nums">
              <Countdown airingAt={airing.airingAt} />
            </span>
          </div>
        ) : null}
      </div>

      <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-ink transition-colors group-hover:text-accent">
        {title}
      </h3>
      {studio ? (
        <p className="mt-0.5 line-clamp-1 text-xs text-ink-subtle">{studio}</p>
      ) : null}
    </Link>
  )
})
