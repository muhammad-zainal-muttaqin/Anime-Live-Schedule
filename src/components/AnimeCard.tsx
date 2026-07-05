import { Link } from '@tanstack/react-router'
import { Star } from 'lucide-react'
import type { AnimeMedia } from '#/lib/anilist/types'
import {
  formatFormat,
  formatScore,
  formatTimeUntil,
  pickTitle,
} from '#/lib/format'

interface AnimeCardProps {
  anime: AnimeMedia
  season: string
  year: string
}

export function AnimeCard({ anime, season, year }: AnimeCardProps) {
  const title = pickTitle(anime.title)
  const score = formatScore(anime.averageScore)
  const cover = anime.coverImage.extraLarge ?? anime.coverImage.large ?? undefined
  const studio = anime.studios.nodes[0]?.name
  const airing = anime.nextAiringEpisode

  return (
    <Link
      to="/$season/$year/$id"
      params={{ season, year, id: String(anime.id) }}
      className="group block focus:outline-none"
      aria-label={title}
    >
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-800 ring-1 ring-white/10 transition duration-300 group-hover:ring-brand-500/60 group-focus-visible:ring-2 group-focus-visible:ring-brand-400"
        style={anime.coverImage.color ? { backgroundColor: anime.coverImage.color } : undefined}
      >
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : null}

        {/* Legibility gradient for the badges sitting on the art. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

        {score ? (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-amber-300 backdrop-blur-sm">
            <Star className="h-3 w-3 fill-amber-300" />
            {score}
          </div>
        ) : null}

        <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-200 backdrop-blur-sm">
          {formatFormat(anime.format)}
        </div>

        {airing ? (
          <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 rounded-lg bg-brand-600/85 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            <span>EP {airing.episode}</span>
            <span className="tabular-nums">{formatTimeUntil(airing.airingAt)}</span>
          </div>
        ) : null}
      </div>

      <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-zinc-100 transition group-hover:text-brand-300">
        {title}
      </h3>
      {studio ? (
        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{studio}</p>
      ) : null}
    </Link>
  )
}
