/**
 * One-time bulk seed: fetch every pickable season from AniList and write it to
 * Cloudflare KV via the REST API.
 *
 * Run from a normal (non-Cloudflare) IP — AniList blocks Worker IPs but not this
 * machine. After this, every season a user can pick is already in KV, so visitors
 * never trigger an AniList fetch. The /seed page then only refreshes the current
 * and upcoming seasons.
 *
 *   node --experimental-strip-types scripts/seed-all.ts [--dry-run]
 *
 * Env: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (both already in User env),
 *      CLOUDFLARE_KV_NAMESPACE_ID (optional; defaults to the CACHE namespace).
 */
import { SEASONAL_QUERY } from '../src/lib/anilist/queries.ts'
import {
  MIN_YEAR,
  SEASONS,
  getMaxYear,
  seasonToApi,
} from '../src/lib/anilist/season.ts'
import type { Season } from '../src/lib/anilist/season.ts'
import {
  altTitles,
  pickTitle,
  stripHtml,
  truncatePlain,
} from '../src/lib/text.ts'

const ANILIST_ENDPOINT = 'https://graphql.anilist.co'
const SEARCH_INDEX_KEY = 'anilist:search:v1:index'
const PER_PAGE = 50
const ANILIST_PACING_MS = 700 // 85 req/mnt — stay under 90
const ANILIST_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const NAMESPACE_ID =
  process.env.CLOUDFLARE_KV_NAMESPACE_ID ?? '57122047ffca4a4c9697df42427760bf'
const DRY_RUN = process.argv.includes('--dry-run')

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Global rate limiter — ensures requests are ≥ ANILIST_PACING_MS apart. */
let lastRequestTime = 0
async function rateLimit() {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < ANILIST_PACING_MS) await sleep(ANILIST_PACING_MS - elapsed)
  lastRequestTime = Date.now()
}

async function anilistGraphQL(variables: Record<string, unknown>): Promise<{
  pageInfo: { hasNextPage: boolean }
  media: unknown[]
}> {
  await rateLimit()
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // See seed-recent.ts — a browser-like UA lowers Cloudflare's 403 rate.
        'User-Agent': ANILIST_USER_AGENT,
      },
      body: JSON.stringify({ query: SEASONAL_QUERY, variables }),
    })
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('Retry-After')) || attempt * 2
      await sleep(Math.min(retryAfter, 30) * 1000)
      continue
    }
    if (!res.ok) throw new Error(`AniList ${res.status}`)
    const json: {
      data?: { Page: { pageInfo: { hasNextPage: boolean }; media: unknown[] } }
      errors?: Array<{ message: string }>
    } = JSON.parse(await res.text())
    if (json.errors?.length) throw new Error(json.errors[0].message)
    return json.data!.Page
  }
  throw new Error('AniList request failed after retries')
}

async function fetchSeason(season: Season, year: number) {
  const apiSeason = seasonToApi(season)
  const media: unknown[] = []
  let pageInfo = { hasNextPage: false }
  let page = 1
  do {
    const p = await anilistGraphQL({
      season: apiSeason,
      seasonYear: year,
      page,
      perPage: PER_PAGE,
    })
    // Truncate synopsis previews exactly like src/lib/anilist/client.ts does, so
    // seeded snapshots match what the /seed page and browser fallback produce.
    for (const raw of p.media) {
      const m = raw as { description?: string | null }
      media.push({
        ...m,
        description: m.description
          ? truncatePlain(stripHtml(m.description))
          : null,
      })
    }
    pageInfo = p.pageInfo
    page++
  } while (pageInfo.hasNextPage)
  return { pageInfo, media, fetchedAt: Date.now() }
}

async function putKv(key: string, value: unknown): Promise<void> {
  const encoded = encodeURIComponent(key)
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}/values/${encoded}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify(value),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`KV PUT ${res.status}: ${body.slice(0, 200)}`)
  }
}

/** Read a KV value. Returns null if missing/error. */
async function getKv(key: string): Promise<unknown> {
  const encoded = encodeURIComponent(key)
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}/values/${encoded}`
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/**
 * Stable fingerprint of a season's media for write-if-changed. Drops
 * `nextAiringEpisode.timeUntilAiring` (a per-request relative countdown) so an
 * unchanged season doesn't burn a KV write. See scripts/seed-recent.ts.
 */
function seasonSignature(media: unknown[]): string {
  return JSON.stringify(
    media.map((raw) => {
      const m = raw as {
        nextAiringEpisode?: { airingAt?: number; episode?: number } | null
      }
      if (!m.nextAiringEpisode) return raw
      return {
        ...m,
        nextAiringEpisode: {
          airingAt: m.nextAiringEpisode.airingAt,
          episode: m.nextAiringEpisode.episode,
        },
      }
    }),
  )
}

// Search-index cover URLs all share this prefix; store just the filename and
// rebuild the URL in the client (src/routes/search.tsx) to shrink the index.
const COVER_URL_PREFIX =
  'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/'
function coverFilename(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith(COVER_URL_PREFIX)
    ? url.slice(COVER_URL_PREFIX.length)
    : url
}

interface IndexEntry {
  id: number
  title: string
  season: string
  year: number
  coverImage: string | null
  format: string | null
  averageScore?: number
  popularity: number | null
  alt: string[]
}

type IndexMedia = {
  id: number
  title: {
    romaji?: string | null
    english?: string | null
    native?: string | null
  }
  synonyms?: string[] | null
  coverImage?: { large?: string | null } | null
  format?: string | null
  averageScore?: number | null
  popularity?: number | null
}

/** Map one AniList media object to a search-index entry (titles + ranking signal). */
function toIndexEntry(m: IndexMedia, season: string, year: number): IndexEntry {
  const title = pickTitle(m.title)
  return {
    id: Number(m.id),
    title,
    season,
    year,
    coverImage: coverFilename(m.coverImage?.large),
    format: m.format ?? null,
    ...(m.averageScore != null ? { averageScore: m.averageScore } : {}),
    popularity: m.popularity ?? null,
    alt: altTitles(m.title, m.synonyms, title),
  }
}

/** Build and write the cross-season search index from results accumulated in memory. */
async function writeSearchIndex(
  results: Map<string, { season: string; year: number; media: unknown[] }>,
): Promise<void> {
  const index: IndexEntry[] = []
  for (const [, result] of results) {
    for (const raw of result.media) {
      index.push(toIndexEntry(raw as IndexMedia, result.season, result.year))
    }
  }
  // Deterministic order so the write-if-changed compare (and the committed
  // search-index.json diff) is stable across runs.
  index.sort((a, b) => a.id - b.id)
  console.log(`\nBuilding search index — ${index.length} entries`)

  if (JSON.stringify(index) === JSON.stringify(await getKv(SEARCH_INDEX_KEY))) {
    console.log('Search index unchanged, skipping write.')
    return
  }
  if (!DRY_RUN) await putKv(SEARCH_INDEX_KEY, index)
  console.log(`Search index written.`)
}

async function main() {
  if (!DRY_RUN && (!ACCOUNT_ID || !API_TOKEN)) {
    console.error(
      'Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN in env.',
    )
    process.exit(1)
  }

  const maxYear = getMaxYear()
  const jobs: Array<{ season: Season; year: number }> = []
  for (let year = maxYear; year >= MIN_YEAR; year--) {
    for (const season of SEASONS) jobs.push({ season, year })
  }

  console.log(
    `Seeding ${jobs.length} seasons (${MIN_YEAR}–${maxYear}) → KV ${NAMESPACE_ID}` +
      (DRY_RUN ? '  [DRY RUN, no writes]' : ''),
  )

  // Accumulate results in memory so we can build the search index at the end.
  const allResults = new Map<
    string,
    { season: string; year: number; media: unknown[] }
  >()

  let wrote = 0
  let unchanged = 0
  let empty = 0
  let failed = 0
  for (const { season, year } of jobs) {
    // Must match seasonKey() in src/server/anilist.ts (the v2 snapshot shape).
    const key = `anilist:season:v2:${season}:${year}`
    try {
      const result = await fetchSeason(season, year)
      if (result.media.length === 0) {
        empty++
        continue // nothing to cache; browser fallback would also get empty
      }
      // Write-if-changed — skip the PUT for seasons already identical in KV
      // (most past seasons never change). A GET is far cheaper than a PUT here.
      const existing = (await getKv(key)) as { media?: unknown[] } | null
      const changed =
        !existing?.media ||
        seasonSignature(existing.media) !== seasonSignature(result.media)
      if (changed) {
        if (!DRY_RUN) await putKv(key, result)
        wrote++
        console.log(`  ✓ ${season} ${year} — ${result.media.length} titles`)
      } else {
        unchanged++
        console.log(
          `  = ${season} ${year} — ${result.media.length} titles (unchanged)`,
        )
      }
      allResults.set(key, { season, year, media: result.media })
    } catch (err) {
      failed++
      console.error(
        `  ✗ ${season} ${year} — ${err instanceof Error ? err.message : err}`,
      )
    }
  }

  console.log(
    `\nDone. wrote=${wrote} unchanged=${unchanged} empty=${empty} failed=${failed}`,
  )

  if (allResults.size > 0) {
    await writeSearchIndex(allResults)
  }

  // Fetched nothing at all — almost always AniList 403ing this IP. Exit non-zero
  // so the failure is visible instead of a silent green run.
  if (!DRY_RUN && allResults.size === 0) {
    console.error(
      '\nFATAL: 0 musim berhasil di-seed — lihat error di atas (biasanya AniList 403, ' +
        'atau limit tulis KV harian Cloudflare). KV tidak diperbarui.',
    )
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
