import type { AniListFuzzyDate, AniListTitle } from '#/lib/anilist/types'

/** Prefer English, fall back to romaji, then native. */
export function pickTitle(title: AniListTitle): string {
  return title.english || title.romaji || title.native || 'Untitled'
}

/** The other titles, for showing under the main one in the modal. */
export function secondaryTitle(title: AniListTitle): string | null {
  const main = pickTitle(title)
  const alt = title.romaji && title.romaji !== main ? title.romaji : title.native
  return alt && alt !== main ? alt : null
}

export const STATUS_LABELS: Record<string, string> = {
  RELEASING: 'Airing',
  FINISHED: 'Finished',
  NOT_YET_RELEASED: 'Upcoming',
  CANCELLED: 'Cancelled',
  HIATUS: 'Hiatus',
}

/** Tailwind classes for the status dot/pill, keyed by AniList status. */
export const STATUS_TONE: Record<string, string> = {
  RELEASING: 'bg-emerald-400',
  FINISHED: 'bg-slate-400',
  NOT_YET_RELEASED: 'bg-sky-400',
  CANCELLED: 'bg-rose-400',
  HIATUS: 'bg-amber-400',
}

export function formatStatus(status: string | null): string {
  if (!status) return 'Unknown'
  return STATUS_LABELS[status] ?? status
}

const FORMAT_LABELS: Record<string, string> = {
  TV: 'TV',
  TV_SHORT: 'TV Short',
  MOVIE: 'Movie',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Music',
}

export function formatFormat(format: string | null): string {
  if (!format) return '—'
  return FORMAT_LABELS[format] ?? format
}

const SOURCE_LABELS: Record<string, string> = {
  ORIGINAL: 'Original',
  MANGA: 'Manga',
  LIGHT_NOVEL: 'Light Novel',
  VISUAL_NOVEL: 'Visual Novel',
  VIDEO_GAME: 'Game',
  NOVEL: 'Novel',
  WEB_NOVEL: 'Web Novel',
  DOUJINSHI: 'Doujinshi',
  MULTIMEDIA_PROJECT: 'Multimedia',
  PICTURE_BOOK: 'Picture Book',
  COMIC: 'Comic',
  GAME: 'Game',
  ANIME: 'Anime',
  LIVE_ACTION: 'Live Action',
  OTHER: 'Lainnya',
}

/** Human label for AniList's MediaSource enum, or null when unknown. */
export function formatSource(source: string | null | undefined): string | null {
  if (!source) return null
  return SOURCE_LABELS[source] ?? null
}

/** "12 eps × 24m", or whichever half is known; null when neither is. */
export function formatEpsDuration(episodes: number | null, duration: number | null): string | null {
  const eps = episodes ? `${episodes} eps` : null
  const mins = duration ? `${duration}m` : null
  if (eps && mins) return `${eps} × ${mins}`
  return eps ?? mins
}

/** AniList averageScore is 0–100. Render as a 0–10 rating string, or null. */
export function formatScore(averageScore: number | null): string | null {
  if (averageScore == null) return null
  return (averageScore / 10).toFixed(1)
}

/** Countdown to an airing time, e.g. "2d 3h 30m 15s", or "aired". */
export function formatTimeUntil(airingAtSeconds: number, now: number = Date.now()): string {
  const diffMs = airingAtSeconds * 1000 - now
  if (diffMs <= 0) return 'aired'

  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function formatFuzzyDate(date: AniListFuzzyDate): string | null {
  if (!date.year) return null
  if (!date.month) return String(date.year)
  const month = MONTHS[date.month - 1] ?? ''
  return date.day ? `${month} ${date.day}, ${date.year}` : `${month} ${date.year}`
}

/** Strip AniList's HTML/markup out of a description for plain-text preview. */
export function stripHtml(html: string | null): string {
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
