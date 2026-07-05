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
  type Season,
} from '../src/lib/anilist/season.ts'

const ANILIST_ENDPOINT = 'https://graphql.anilist.co'
const PER_PAGE = 50
const ANILIST_PACING_MS = 800 // stay well under 90 req/min

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const NAMESPACE_ID =
  process.env.CLOUDFLARE_KV_NAMESPACE_ID ?? '57122047ffca4a4c9697df42427760bf'
const DRY_RUN = process.argv.includes('--dry-run')

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Mirrors of src/lib/format.ts#stripHtml and src/lib/filter.ts#truncatePlain.
// Duplicated (not imported) because those modules use `#/` subpath imports that
// a plain `node --experimental-strip-types` run can't resolve. Keep in sync.
function stripHtml(html: string | null): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .trim()
}

function truncatePlain(text: string, max = 300): string {
  if (text.length <= max) return text
  const slice = text.slice(0, max)
  const lastSpace = slice.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`
}

async function anilistGraphQL(variables: Record<string, unknown>): Promise<{
  pageInfo: { hasNextPage: boolean }
  media: unknown[]
}> {
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
    // Truncate synopsis previews exactly like src/lib/anilist/client.ts does, so
    // seeded snapshots match what the /seed page and browser fallback produce.
    for (const raw of p.media) {
      const m = raw as { description?: string | null }
      media.push({
        ...m,
        description: m.description ? truncatePlain(stripHtml(m.description)) : null,
      })
    }
    pageInfo = p.pageInfo
    page++
    await sleep(ANILIST_PACING_MS)
  } while (pageInfo.hasNextPage)
  return { pageInfo, media, fetchedAt: Date.now() }
}

async function putKv(key: string, value: unknown): Promise<void> {
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

/** Best-effort delete of a key (used to clear the old v1 seed format). */
async function deleteKv(key: string): Promise<void> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}/values/${encodeURIComponent(key)}`
  try {
    await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${API_TOKEN}` } })
  } catch {
    // ignore — cleanup is optional
  }
}

/** Minimal pickTitle clone (can't import #/lib/format from scripts). */
function pickTitle(title: { romaji?: string | null; english?: string | null; native?: string | null }): string {
  return title.english || title.romaji || title.native || 'Untitled'
}

/** Build and write the cross-season search index from results accumulated in memory. */
async function writeSearchIndex(
  results: Map<string, { season: string; year: number; media: unknown[] }>,
): Promise<void> {
  const index: Array<{ id: number; title: string; season: string; year: number; coverImage: string | null; format: string | null; averageScore: number | null }> = []
  for (const [, result] of results) {
    for (const raw of result.media) {
      const m = raw as { id: number; title: { romaji?: string | null; english?: string | null; native?: string | null }; coverImage: { large?: string | null }; format?: string | null; averageScore?: number | null }
      index.push({
        id: m.id,
        title: pickTitle(m.title),
        season: result.season,
        year: result.year,
        coverImage: m.coverImage?.large ?? null,
        format: m.format ?? null,
        averageScore: m.averageScore ?? null,
      })
    }
  }
  console.log(`\nBuilding search index — ${index.length} entries`)
  if (!DRY_RUN) await putKv('anilist:search:v1:index', index)
  console.log(`Search index written.`)
}

async function main() {
  if (!DRY_RUN && (!ACCOUNT_ID || !API_TOKEN)) {
    console.error('Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN in env.')
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
  const allResults = new Map<string, { season: string; year: number; media: unknown[] }>()

  let written = 0
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
      if (!DRY_RUN) {
        await putKv(key, result)
        await deleteKv(`anilist:season:${season}:${year}`) // drop stale v1 key
      }
      allResults.set(key, { season, year, media: result.media })
      written++
      console.log(`  ✓ ${season} ${year} — ${result.media.length} titles`)
    } catch (err) {
      failed++
      console.error(`  ✗ ${season} ${year} — ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nDone. written=${written} empty=${empty} failed=${failed}`)

  if (written > 0) {
    await writeSearchIndex(allResults)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
