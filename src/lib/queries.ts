import { queryOptions } from '@tanstack/react-query'
import { getAnimeDetail, getSeasonalAnime } from '#/server/anilist'
import type { Season } from '#/lib/anilist/season'

/**
 * React Query options that wrap the server functions. The server function does
 * the AniList fetch + KV cache; React Query then caches the *result* on the
 * client, so flipping between seasons you've already opened doesn't even hit
 * the server again during a session.
 */

export const seasonalQueryOptions = (season: Season, year: number) =>
  queryOptions({
    queryKey: ['seasonal', season, year] as const,
    queryFn: () => getSeasonalAnime({ data: { season, year } }),
    staleTime: 1000 * 60 * 60, // 1 hour
  })

export const animeDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['anime', id] as const,
    queryFn: () => getAnimeDetail({ data: { id } }),
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
  })
