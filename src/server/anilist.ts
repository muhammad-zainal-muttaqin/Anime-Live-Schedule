import { createServerFn } from '@tanstack/react-start'
import { DETAIL_QUERY, SEASONAL_QUERY } from '#/lib/anilist/queries'
import { isSeason, seasonToApi, type Season } from '#/lib/anilist/season'
import type { AnimeDetail, PageInfo, AnimeMedia, SeasonalResult } from '#/lib/anilist/types'

const ANILIST_ENDPOINT = 'https://graphql.anilist.co'
const PER_PAGE = 50

// KV time-to-live. Past seasons never change, so they could live forever;
// the current/upcoming season shifts as scores and airing times update, so we
// keep it fresh-ish. One TTL keeps things simple and is plenty under the limit.
const SEASONAL_TTL_SECONDS = 60 * 60 * 6 // 6 hours
const DETAIL_TTL_SECONDS = 60 * 60 * 24 // 24 hours

/**
 * Grab the KV cache binding. Imported dynamically so `cloudflare:workers` never
 * lands in the client bundle — this only ever runs inside a server function
 * handler, which is stripped from client builds. Returns undefined if the
 * binding is missing (e.g. running outside Workers) so we degrade to no-cache.
 */
async function getCache(): Promise<KVNamespace | undefined> {
  try {
    const { env } = await import('cloudflare:workers')
    return env.CACHE
  } catch {
    return undefined
  }
}

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
    // Cache writes are best-effort; a failure just means the next request refetches.
  }
}

interface GraphQLResponse<T> {
  data: T | null
  errors?: Array<{ message: string; status?: number }>
}

/** POST a query to AniList with a small retry for rate-limit / transient errors. */
async function anilistFetch<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const maxAttempts = 3
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response
    try {
      res = await fetch(ANILIST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      })
    } catch (err) {
      lastError = err
      continue // network hiccup — retry
    }

    // Rate limited or transient server error: honour Retry-After, then retry.
    if (res.status === 429 || res.status >= 500) {
      lastError = new Error(`AniList responded ${res.status}`)
      if (attempt < maxAttempts) {
        const retryAfter = Number(res.headers.get('Retry-After')) || attempt
        await sleep(Math.min(retryAfter, 5) * 1000)
        continue
      }
      break
    }

    if (!res.ok) {
      throw new Error(`AniList request failed with status ${res.status}`)
    }

    const json = (await res.json()) as GraphQLResponse<T>
    if (json.errors?.length) {
      throw new Error(json.errors[0]?.message ?? 'AniList GraphQL error')
    }
    if (json.data == null) {
      throw new Error('AniList returned no data')
    }
    return json.data
  }

  throw lastError instanceof Error ? lastError : new Error('AniList request failed')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface SeasonInput {
  season: string
  year: number
}

function validateSeasonInput(input: SeasonInput): { season: Season; year: number } {
  if (!isSeason(input.season)) {
    throw new Error(`Invalid season: ${input.season}`)
  }
  const year = Number(input.year)
  if (!Number.isInteger(year) || year < 1940 || year > 2100) {
    throw new Error(`Invalid year: ${input.year}`)
  }
  return { season: input.season, year }
}

/**
 * Seasonal anime list. Cache-first: KV is checked before AniList, so repeated
 * views of the same season cost zero AniList requests until the TTL expires.
 */
// Cap on how many pages we page through per season. 6 × 50 = 300 titles is
// more than any real season, so this fetches the whole season while bounding
// worst-case work on a cache miss.
const MAX_PAGES = 6

export const getSeasonalAnime = createServerFn({ method: 'GET' })
  .validator(validateSeasonInput)
  .handler(async ({ data }): Promise<SeasonalResult> => {
    const cacheKey = `anilist:season:${data.season}:${data.year}`

    const cached = await kvGetJson<SeasonalResult>(cacheKey)
    if (cached) return cached

    const apiSeason = seasonToApi(data.season)
    const media: AnimeMedia[] = []
    let pageInfo: PageInfo = {
      total: 0,
      currentPage: 0,
      lastPage: 0,
      hasNextPage: false,
      perPage: PER_PAGE,
    }

    // Page through the whole season. Only ever runs on a cache miss, so the
    // handful of AniList requests is amortised across the TTL window.
    let page = 1
    do {
      const payload = await anilistFetch<{
        Page: { pageInfo: PageInfo; media: AnimeMedia[] }
      }>(SEASONAL_QUERY, {
        season: apiSeason,
        seasonYear: data.year,
        page,
        perPage: PER_PAGE,
      })
      media.push(...payload.Page.media)
      pageInfo = payload.Page.pageInfo
      page++
    } while (pageInfo.hasNextPage && page <= MAX_PAGES)

    const result: SeasonalResult = {
      pageInfo,
      media,
      fetchedAt: Date.now(),
    }

    await kvPutJson(cacheKey, result, SEASONAL_TTL_SECONDS)
    return result
  })

/** Full detail for a single title, cached longer since it rarely changes. */
export const getAnimeDetail = createServerFn({ method: 'GET' })
  .validator((input: { id: number }): { id: number } => {
    const id = Number(input.id)
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Invalid anime id: ${input.id}`)
    }
    return { id }
  })
  .handler(async ({ data }): Promise<AnimeDetail> => {
    const cacheKey = `anilist:media:${data.id}`

    const cached = await kvGetJson<AnimeDetail>(cacheKey)
    if (cached) return cached

    const payload = await anilistFetch<{ Media: AnimeDetail }>(DETAIL_QUERY, { id: data.id })

    await kvPutJson(cacheKey, payload.Media, DETAIL_TTL_SECONDS)
    return payload.Media
  })
