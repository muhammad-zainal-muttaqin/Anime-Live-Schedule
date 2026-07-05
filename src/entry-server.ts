import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'

const SITE = 'https://anime-live-schedule.mzainalmuttaqin6.workers.dev'
const MIN_YEAR = 1960
const SEASONS = ['winter', 'spring', 'summer', 'fall'] as const

const startHandler = createStartHandler(defaultStreamHandler)

function getCurrentSeason(now: Date) {
  const month = now.getUTCMonth()
  const year = now.getUTCFullYear()
  const season = month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'fall'
  return { season, year }
}

function generateSitemap(): string {
  const now = new Date()
  const maxYear = now.getUTCFullYear() + 1
  const current = getCurrentSeason(now)
  const currentIdx = SEASONS.indexOf(current.season as (typeof SEASONS)[number])

  const urls: string[] = []
  for (let year = maxYear; year >= MIN_YEAR; year--) {
    for (const season of SEASONS) {
      const seasonIdx = SEASONS.indexOf(season)
      if (year === maxYear && seasonIdx > currentIdx) continue
      if (year === MIN_YEAR && seasonIdx < currentIdx) continue
      const priority = year === current.year && season === current.season ? '1.0'
        : year === current.year ? '0.9'
        : year === current.year - 1 ? '0.7'
        : '0.5'
      urls.push(`  <url>
    <loc>${SITE}/${season}/${year}</loc>
    <changefreq>${year === current.year ? 'weekly' : 'monthly'}</changefreq>
    <priority>${priority}</priority>
  </url>`)
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`
}

export default {
  async fetch(request: Request, _env: unknown, _ctx: unknown) {
    const url = new URL(request.url)

    if (url.pathname === '/robots.txt') {
      return new Response(
        `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
      )
    }

    if (url.pathname === '/sitemap.xml') {
      return new Response(generateSitemap(), {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      })
    }

    return startHandler(request)
  },
}
