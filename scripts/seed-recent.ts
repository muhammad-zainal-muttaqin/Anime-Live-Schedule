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
  seasonToApi,
  type Season,
} from '../src/lib/anilist/season.ts'

const ANILIST_ENDPOINT = 'https://graphql.anilist.co'
const PER_PAGE = 50
const MAX_PAGES = 6
const ANILIST_PACING_MS = 800
// Must match SEASONAL_TTL_SECONDS in src/server/anilist.ts
const KV_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const NAMESPACE_ID =
  process.env.CLOUDFLARE_KV_NAMESPACE_ID ?? '57122047ffca4a4c9697df42427760bf'
const DRY_RUN = process.argv.includes('--dry-run')

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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
  } while (pageInfo.hasNextPage && page <= MAX_PAGES)
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
      written++
      console.log(`✓ ${season} ${year} — ${result.media.length} judul`)
    } catch (err) {
      failed++
      console.error(`✗ ${season} ${year} — ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nSelesai. berhasil=${written} gagal=${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
