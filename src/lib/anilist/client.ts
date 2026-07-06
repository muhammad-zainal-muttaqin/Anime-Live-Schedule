/**
 * Direct AniList GraphQL client: plain `fetch`, no Cloudflare imports, so it
 * runs anywhere: the browser, local dev, and the GitHub Actions refresh job.
 *
 * Important: this must NOT be called from a Cloudflare Worker. AniList blocks
 * the shared Cloudflare Workers IP range (responds 403 "manually blocked"), so
 * on the deployed Worker we only ever read pre-populated data from KV. AniList
 * is reached from GitHub Actions (fills KV) and from the visitor's browser
 * (on-demand detail + cold-season fallback), both of which use non-blocked IPs.
 */
import { DETAIL_QUERY, SEASONAL_QUERY } from '#/lib/anilist/queries'
import { seasonToApi } from '#/lib/anilist/season'
import type { Season } from '#/lib/anilist/season'
import { truncatePlain } from '#/lib/filter'
import { stripHtml } from '#/lib/format'
import type {
  AnimeDetail,
  AnimeMedia,
  PageInfo,
  SeasonalResult,
} from '#/lib/anilist/types'

const ANILIST_ENDPOINT = 'https://graphql.anilist.co'
const PER_PAGE = 50
const ANILIST_PACING_MS = 400 // be nice to AniList rate limiter
const ANILIST_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

interface GraphQLResponse<T> {
  data: T | null
  errors?: Array<{ message: string; status?: number }>
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** POST a query to AniList with a small retry for rate-limit / transient errors. */
export async function anilistGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
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
          // Harmless in the browser (fetch ignores it), but when this client
          // runs under Node (dev SSR / scripts) a real UA lowers the chance
          // Cloudflare 403s the request in front of AniList.
          'User-Agent': ANILIST_USER_AGENT,
        },
        body: JSON.stringify({ query, variables }),
      })
    } catch (err) {
      lastError = err
      continue // network hiccup, retry
    }

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

    const json: GraphQLResponse<T> = JSON.parse(await res.text())
    if (json.errors?.length) {
      throw new Error(json.errors[0]?.message ?? 'AniList GraphQL error')
    }
    if (json.data == null) {
      throw new Error('AniList returned no data')
    }
    return json.data
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('AniList request failed')
}

/** Fetch and page an entire season into one result object. */
export async function fetchSeasonalPaged(
  season: Season,
  year: number,
): Promise<SeasonalResult> {
  const apiSeason = seasonToApi(season)
  const media: AnimeMedia[] = []
  let pageInfo: PageInfo = {
    total: 0,
    currentPage: 0,
    lastPage: 0,
    hasNextPage: false,
    perPage: PER_PAGE,
  }

  let page = 1
  do {
    const payload = await anilistGraphQL<{
      Page: { pageInfo: PageInfo; media: AnimeMedia[] }
    }>(SEASONAL_QUERY, {
      season: apiSeason,
      seasonYear: year,
      page,
      perPage: PER_PAGE,
    })
    // Season snapshots only need a synopsis preview; truncating here keeps
    // the KV payload and SSR-dehydrated HTML small (detail fetches full text).
    media.push(
      ...payload.Page.media.map((m) => ({
        ...m,
        description: m.description
          ? truncatePlain(stripHtml(m.description))
          : null,
      })),
    )
    pageInfo = payload.Page.pageInfo
    page++
    await sleep(ANILIST_PACING_MS)
  } while (pageInfo.hasNextPage)

  return { pageInfo, media, fetchedAt: Date.now() }
}

/** Fetch the full detail for a single title. */
export async function fetchAnimeDetail(id: number): Promise<AnimeDetail> {
  const payload = await anilistGraphQL<{ Media: AnimeDetail }>(DETAIL_QUERY, {
    id,
  })
  return payload.Media
}
