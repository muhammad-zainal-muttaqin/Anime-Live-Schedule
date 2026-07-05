/**
 * Refresh the current season and next 4 upcoming seasons from AniList,
 * writing snapshots directly to Cloudflare KV via its REST API.
 *
 * Designed for GitHub Actions (cron), but works locally too.
 *
 *   node --experimental-strip-types scripts/seed-recent.ts [--dry-run]
 *
 * Env: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (both already in User env),
 *      CLOUDFLARE_KV_NAMESPACE_ID (optional; defaults to the CACHE namespace).
 */
import { SEASONAL_QUERY } from '../src/lib/anilist/queries.ts'
import {
  getCurrentSeason,
  shiftSeason,
  seasonToApi
  
} from '../src/lib/anilist/season.ts'
import type {Season} from '../src/lib/anilist/season.ts';
import { altTitles, pickTitle, stripHtml, truncatePlain } from '../src/lib/text.ts'

const ANILIST_ENDPOINT = 'https://graphql.anilist.co'
const PER_PAGE = 50
const ANILIST_PACING_MS = 700
// Must match SEASONAL_TTL_SECONDS in src/server/anilist.ts
const KV_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

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
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: SEASONAL_QUERY, variables }),
    })
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('Retry-After')) || attempt * 2
      await sleep(Math.min(retryAfter, 30) * 1000)
      continue
    }
    if (!res.ok) throw new Error(`AniList ${res.status}`)
    const json = (await res.json()) as {
      data?: { Page: { pageInfo: { hasNextPage: boolean }; media: unknown[] } }
      errors?: Array<{ message: string }>
    }
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
    const p = await anilistGraphQL({ season: apiSeason, seasonYear: year, page, perPage: PER_PAGE })
    for (const raw of p.media) {
      const m = raw as { description?: string | null }
      media.push({
        ...m,
        description: m.description ? truncatePlain(stripHtml(m.description)) : null,
      })
    }
    pageInfo = p.pageInfo
    page++
  } while (pageInfo.hasNextPage)
  return { pageInfo, media, fetchedAt: Date.now() }
}

async function putKv(key: string, value: unknown): Promise<void> {
  const encoded = encodeURIComponent(key)
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}/values/${encoded}?expiration_ttl=${KV_TTL_SECONDS}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'text/plain' },
    body: JSON.stringify(value),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`KV PUT ${res.status}: ${body.slice(0, 200)}`)
  }
}

function seedWindow(): Array<{ season: Season; year: number }> {
  const list: Array<{ season: Season; year: number }> = []
  let cursor = getCurrentSeason()
  for (let i = 0; i < 5; i++) {
    list.push({ season: cursor.season, year: cursor.year })
    cursor = shiftSeason(cursor.season, cursor.year, 1)
  }
  return list
}

/* Put a KV value with no TTL (for the persistent search index). */
async function putKvPersist(key: string, value: unknown): Promise<void> {
  const encoded = encodeURIComponent(key)
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}/values/${encoded}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'text/plain' },
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
    const res = await fetch(url, { headers: { Authorization: `Bearer ${API_TOKEN}` } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

interface IndexEntry {
  id: number
  title: string
  season: string
  year: number
  coverImage: string | null
  format: string | null
  averageScore: number | null
  popularity: number | null
  alt: string[]
}

type IndexMedia = {
  id: number
  title: { romaji?: string | null; english?: string | null; native?: string | null }
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
    coverImage: m.coverImage?.large ?? null,
    format: m.format ?? null,
    averageScore: m.averageScore ?? null,
    popularity: m.popularity ?? null,
    alt: altTitles(m.title, m.synonyms, title),
  }
}

/** Merge new season data into the existing KV search index (preserves other seasons). */
async function writeSearchIndex(
  results: Map<string, { season: string; year: number; media: unknown[] }>,
): Promise<void> {
  // Read existing index from KV
  let existing: IndexEntry[] = []
  const raw = await getKv('anilist:search:v1:index')
  if (Array.isArray(raw)) existing = raw as IndexEntry[]

  // The seasons we're replacing wholesale this run. Any existing entry in one of
  // these gets dropped and rebuilt from `fresh`, so titles removed from AniList
  // (or that switched season/year) don't linger in the index.
  const updatedSeasons = new Set<string>()
  const fresh: IndexEntry[] = []
  for (const [, result] of results) {
    updatedSeasons.add(`${result.season}:${result.year}`)
    for (const m of result.media) {
      fresh.push(toIndexEntry(m as IndexMedia, result.season, result.year))
    }
  }

  // Keep entries from untouched seasons; replace updated seasons with fresh data.
  const kept = existing.filter((e) => !updatedSeasons.has(`${e.season}:${e.year}`))
  const merged = [...kept, ...fresh]
  console.log(
    `Search index: ${existing.length} → ${merged.length} entri ` +
      `(${fresh.length} di ${updatedSeasons.size} musim di-refresh, ${existing.length - kept.length} lama dibuang)`,
  )

  if (!DRY_RUN) {
    await putKvPersist('anilist:search:v1:index', merged)
  }
}

async function main() {
  if (!DRY_RUN && (!ACCOUNT_ID || !API_TOKEN)) {
    console.error('Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN in env.')
    process.exit(1)
  }

  const jobs = seedWindow()
  console.log(
    `Seeding ${jobs.length} seasons (current + 4 upcoming) → KV ${NAMESPACE_ID}` +
      (DRY_RUN ? '  [DRY RUN, no writes]' : ''),
  )

  const allResults = new Map<string, { season: string; year: number; media: unknown[] }>()

  let written = 0
  let failed = 0
  for (const { season, year } of jobs) {
    const key = `anilist:season:v2:${season}:${year}`
    try {
      const result = await fetchSeason(season, year)
      if (result.media.length === 0) {
        console.log(`${season} ${year} — 0 judul (lewati)`)
        continue
      }
      if (!DRY_RUN) await putKv(key, result)
      allResults.set(key, { season, year, media: result.media })
      written++
      console.log(`✓ ${season} ${year} — ${result.media.length} judul`)
    } catch (err) {
      failed++
      console.error(`✗ ${season} ${year} — ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nSelesai. berhasil=${written} gagal=${failed}`)

  if (written > 0) {
    await writeSearchIndex(allResults)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
