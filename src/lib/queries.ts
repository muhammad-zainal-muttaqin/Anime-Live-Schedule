import { queryOptions } from '@tanstack/react-query'
import { fetchAnimeDetail, fetchSeasonalPaged } from '#/lib/anilist/client'
import { getSeasonalAnime } from '#/server/anilist'
import type { Season } from '#/lib/anilist/season'

/**
 * React Query options.
 *
 * Seasonal: ask the Worker (KV read) first. On a production cache miss the
 * server returns an empty result — so when we're in the browser we fetch AniList
 * directly (non-blocked IP, AniList sends CORS `*`). SSR never fetches AniList,
 * which is exactly what keeps the Worker from hitting the 403.
 *
 * Detail: always fetched directly from the browser for the same reason, so the
 * options are only ever enabled client-side (see the detail route).
 */

export const seasonalQueryOptions = (season: Season, year: number) =>
  queryOptions({
    queryKey: ['seasonal', season, year] as const,
    queryFn: async () => {
      const fromKv = await getSeasonalAnime({ data: { season, year } })
      if (fromKv.media.length > 0) return fromKv
      // Cold season (not seeded): fetch it live from the browser.
      if (typeof window !== 'undefined') {
        return await fetchSeasonalPaged(season, year)
      }
      return fromKv
    },
    // Revalidate on the client so an SSR-empty cold season fills in on mount.
    staleTime: 0,
    gcTime: 1000 * 60 * 30,
  })

export const animeDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['anime', id] as const,
    queryFn: () => fetchAnimeDetail(id),
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
  })
