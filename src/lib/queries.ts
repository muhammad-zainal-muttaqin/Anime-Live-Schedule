import { queryOptions } from '@tanstack/react-query'
import { fetchAnimeDetail, fetchSeasonalPaged } from '#/lib/anilist/client'
import { getSeasonalAnime } from '#/server/anilist'
import { SEASONS, getCurrentSeason } from '#/lib/anilist/season'
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

// KV is reseeded every ~3h by CI. If it's older than that the seed pipeline is
// behind (AniList 403s the runner IP intermittently), so the browser self-heals
// by refetching directly — see the queryFn below.
const SEASON_STALE_MS = 1000 * 60 * 60 * 3

function seasonOrdinal(season: Season, year: number): number {
  return year * SEASONS.length + SEASONS.indexOf(season)
}

/** Only the current + upcoming seasons have live countdowns worth refreshing. */
function isCurrentOrUpcoming(season: Season, year: number): boolean {
  const c = getCurrentSeason()
  return seasonOrdinal(season, year) >= seasonOrdinal(c.season, c.year)
}

export const seasonalQueryOptions = (season: Season, year: number) =>
  queryOptions({
    queryKey: ['seasonal', season, year] as const,
    queryFn: async () => {
      const fromKv = await getSeasonalAnime({ data: { season, year } })
      const inBrowser = typeof window !== 'undefined'
      if (fromKv.media.length > 0) {
        // Self-heal: when the seed pipeline is behind and this season still has
        // live countdowns, refresh straight from AniList (browser IP isn't
        // blocked) so stale snapshots don't rot into wrong "aired" badges.
        // Falls back to the KV snapshot on any error. No-op when KV is fresh,
        // so a healthy pipeline means zero extra AniList calls.
        const stale = Date.now() - fromKv.fetchedAt > SEASON_STALE_MS
        if (inBrowser && stale && isCurrentOrUpcoming(season, year)) {
          try {
            return await fetchSeasonalPaged(season, year)
          } catch {
            return fromKv
          }
        }
        return fromKv
      }
      // Cold season (not seeded): fetch it live from the browser.
      if (inBrowser) {
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
