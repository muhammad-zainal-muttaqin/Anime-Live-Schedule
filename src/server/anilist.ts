import { createServerFn } from '@tanstack/react-start'
import { fetchSeasonalPaged } from '#/lib/anilist/client'
import { isSeason, type Season } from '#/lib/anilist/season'
import type { SeasonalResult } from '#/lib/anilist/types'

/**
 * Data layer for the deployed Worker.
 *
 * IMPORTANT: AniList blocks the shared Cloudflare Workers IP range (403), so the
 * Worker must never fetch AniList directly. Everything here only ever reads from
 * or writes to KV. Fresh data reaches KV two ways, both from non-blocked IPs:
 *   - the GitHub Actions cron (`.github/workflows/seed-recent.yml` —
 *     fetches AniList, writes directly to KV via REST API)
 *   - the on-demand browser fallback in `src/lib/queries.ts`
 * In local dev there's no IP block, so a cache miss is allowed to fetch AniList
 * to keep the DX smooth.
 */

// Seeded data persists for a month so the site keeps working if you forget to
// reseed for a while. Reseeding just overwrites the key.
const SEASONAL_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

const EMPTY_RESULT: SeasonalResult = {
  pageInfo: { total: 0, currentPage: 0, lastPage: 0, hasNextPage: false, perPage: 0 },
  media: [],
  fetchedAt: 0,
}

/**
 * Grab the KV cache binding. Imported dynamically so `cloudflare:workers` never
 * lands in the client bundle — this only ever runs inside a server function
 * handler, which is stripped from client builds. Returns undefined if the
 * binding is missing (e.g. running outside Workers) so we degrade gracefully.
 */
async function getCache(): Promise<KVNamespace | undefined> {
  try {
    const { env } = await import('cloudflare:workers')
    return env.CACHE
  } catch {
    return undefined
  }
}

// ── DISABLED ─────────────────────────────────────────────────────
// Dulu: guard untuk seedSeason (token via wrangler secret).
// Sekarang seeding otomatis via GitHub Actions cron, jadi fungsi
// ini gak dipakai. Kalau suatu saat `/seed` diaktifkan lagi,
// cukup uncomment kode di bawah + bagian seedSeason.
//
// /** The shared secret that guards `seedSeason`. Set via `wrangler secret put SEED_TOKEN`. */
// async function getSeedToken(): Promise<string | undefined> {
//   try {
//     const { env } = await import('cloudflare:workers')
//     return (env as { SEED_TOKEN?: string }).SEED_TOKEN
//   } catch {
//     return undefined
//   }
// }
// ─────────────────────────────────────────────────────────────────

async function kvGetJson<T>(key: string): Promise<T | null> {
  const cache = await getCache()
  if (!cache) return null
  try {
    return (await cache.get(key, 'json')) as T | null
  } catch {
    return null
  }
}

async function kvPutJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const cache = await getCache()
  if (!cache) return
  try {
    await cache.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds })
  } catch {
    // Cache writes are best-effort; a failure just means the next reseed refills it.
  }
}

interface SeasonInput {
  season: string
  year: number
}

function validateSeasonInput(input: SeasonInput): { season: Season; year: number } {
  if (!isSeason(input.season)) {
    throw new Error('Invalid season parameter')
  }
  const year = Number(input.year)
  if (!Number.isInteger(year) || year < 1940 || year > 2100) {
    throw new Error('Invalid year parameter')
  }
  return { season: input.season, year }
}

// v2: seasonal snapshots gained `source` + truncated `description`.
function seasonKey(season: Season, year: number): string {
  return `anilist:season:v2:${season}:${year}`
}

/**
 * Read a season from KV. In production the Worker never falls through to AniList
 * (it's IP-blocked); an empty result signals the client to fetch it directly.
 * In dev we allow a live fetch on miss so the app is usable without seeding.
 */
export const getSeasonalAnime = createServerFn({ method: 'GET' })
  .validator(validateSeasonInput)
  .handler(async ({ data }): Promise<SeasonalResult> => {
    const key = seasonKey(data.season, data.year)

    const cached = await kvGetJson<SeasonalResult>(key)
    if (cached) return cached

    // Dev-only: no IP block locally, so warm the cache on demand.
    if (import.meta.env.DEV) {
      const fresh = await fetchSeasonalPaged(data.season, data.year)
      await kvPutJson(key, fresh, SEASONAL_TTL_SECONDS)
      return fresh
    }

    // Production miss: let the browser fetch it (see seasonalQueryOptions).
    return EMPTY_RESULT
  })

// ── DISABLED ─────────────────────────────────────────────────────
// SeedInput + seedSeason dulu dipakai oleh /seed page. Sekarang
// seeding via GitHub Actions cron langsung ke KV REST API, jadi
// endpoint server ini dinonaktifkan. Kalau mau diaktifkan lagi,
// uncomment blok di bawah + bagian getSeedToken() di atas.
//
// interface SeedInput {
//   token: string
//   season: string
//   year: number
//   result: SeasonalResult
// }
//
// export const seedSeason = createServerFn({ method: 'POST' })
//   .validator((input: SeedInput): { token: string; season: Season; year: number; result: SeasonalResult } => {
//     if (!isSeason(input.season)) throw new Error(`Invalid season: ${input.season}`)
//     const year = Number(input.year)
//     if (!Number.isInteger(year) || year < 1940 || year > 2100) {
//       throw new Error(`Invalid year: ${input.year}`)
//     }
//     if (!input.result || !Array.isArray(input.result.media)) {
//       throw new Error('Missing seed payload')
//     }
//     return { token: String(input.token ?? ''), season: input.season, year, result: input.result }
//   })
//   .handler(async ({ data }): Promise<{ ok: true; count: number }> => {
//     const expected = await getSeedToken()
//     if (!import.meta.env.DEV) {
//       if (!expected) throw new Error('SEED_TOKEN is not configured on the server')
//       if (data.token !== expected) throw new Error('Unauthorized')
//     }
//     await kvPutJson(seasonKey(data.season, data.year), data.result, SEASONAL_TTL_SECONDS)
//     return { ok: true, count: data.result.media.length }
//   })
// ─────────────────────────────────────────────────────────────────
