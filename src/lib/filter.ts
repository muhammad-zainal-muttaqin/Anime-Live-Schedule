/**
 * Client-side filter/sort pipeline for the season grid.
 *
 * The whole season is already in memory (one KV read, ≤300 titles), so every
 * facet here (format bucket, text search, genre intersection, sorting) runs
 * as pure functions over that array. Filter state lives in URL search params
 * (see `parseSearch`), which keeps filtered views shareable and SSR-able.
 */
import type { AniListFuzzyDate, AnimeMedia } from '#/lib/anilist/types'
import { normalizeText, pickTitle, truncatePlain } from '#/lib/text'

// Re-exported so existing `#/lib/filter` importers (e.g. anilist/client) keep
// working; the canonical definitions live in the dependency-free `#/lib/text`.
export { normalizeText, truncatePlain }

export const FORMAT_BUCKETS = ['all', 'tv', 'movie', 'ova'] as const
export type FormatBucket = (typeof FORMAT_BUCKETS)[number]

export const SORT_KEYS = [
  'popularity',
  'score',
  'countdown',
  'title',
  'start',
] as const
export type SortKey = (typeof SORT_KEYS)[number]

export const SORT_DIRS = ['asc', 'desc'] as const
export type SortDir = (typeof SORT_DIRS)[number]

export const VIEW_MODES = ['grid', 'list'] as const
export type ViewMode = (typeof VIEW_MODES)[number]

/** Shape of the validated URL search params on /$season/$year. */
export interface SeasonSearch {
  q?: string
  format?: FormatBucket
  /** Comma-joined genre names (AniList genres never contain commas). */
  genre?: string
  sort?: SortKey
  dir?: SortDir
  view?: ViewMode
  includeAdult?: boolean
}

/** Fully-resolved filter state the UI works with. */
export interface SeasonFilters {
  q: string
  format: FormatBucket
  genres: string[]
  sort: SortKey
  dir: SortDir
  view: ViewMode
  includeAdult: boolean
}

/** The direction each sort key naturally reads in (stripped from the URL). */
export const NATURAL_DIR: Record<SortKey, SortDir> = {
  popularity: 'desc',
  score: 'desc',
  countdown: 'asc',
  title: 'asc',
  start: 'asc',
}

/** Defaults handed to TanStack Router's `stripSearchParams` for clean URLs. */
export const FILTER_DEFAULTS = {
  q: '',
  format: 'all',
  genre: '',
  sort: 'popularity',
  view: 'grid',
  includeAdult: false,
} as const

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof value === 'string' &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined
}

/**
 * `validateSearch` body: coerce anything (garbage, missing, wrong type) into a
 * valid search object; never throw. `dir` collapses to `undefined` when it
 * equals the sort's natural direction so it disappears from the URL.
 */
export function parseSearch(raw: Record<string, unknown>): SeasonSearch {
  const q = typeof raw.q === 'string' ? raw.q : ''
  const format = oneOf(raw.format, FORMAT_BUCKETS) ?? 'all'
  const genre = typeof raw.genre === 'string' ? raw.genre : ''
  const sort = oneOf(raw.sort, SORT_KEYS) ?? 'popularity'
  const rawDir = oneOf(raw.dir, SORT_DIRS)
  const dir = rawDir === NATURAL_DIR[sort] ? undefined : rawDir
  const view = oneOf(raw.view, VIEW_MODES) ?? 'grid'
  const includeAdult = raw.includeAdult === true
  return { q, format, genre, sort, dir, view, includeAdult }
}

/** Fill defaults and split the genre list. */
export function resolveFilters(search: SeasonSearch): SeasonFilters {
  const sort = search.sort ?? 'popularity'
  return {
    q: search.q ?? '',
    format: search.format ?? 'all',
    genres: (search.genre ?? '').split(',').filter(Boolean),
    sort,
    dir: search.dir ?? NATURAL_DIR[sort],
    view: search.view ?? 'grid',
    includeAdult: search.includeAdult ?? false,
  }
}

/** True when anything other than the view mode deviates from defaults. */
export function hasActiveFilters(filters: SeasonFilters): boolean {
  return (
    filters.q !== '' ||
    filters.format !== 'all' ||
    filters.genres.length > 0 ||
    filters.sort !== 'popularity' ||
    filters.dir !== NATURAL_DIR[filters.sort] ||
    filters.includeAdult
  )
}

/** Search-param patch that clears every filter but keeps the view mode. */
export const RESET_PATCH: SeasonSearch = {
  q: '',
  format: 'all',
  genre: '',
  sort: 'popularity',
  dir: undefined,
  includeAdult: undefined,
}

/** Toggle one genre in the comma-joined `genre` param. */
export function withGenreToggled(
  filters: SeasonFilters,
  genre: string,
): string {
  const next = filters.genres.includes(genre)
    ? filters.genres.filter((g) => g !== genre)
    : [...filters.genres, genre]
  return next.join(',')
}

/** Map an AniList format to the toolbar's bucket; unknown/null match only "all". */
export function formatBucketOf(format: string | null): FormatBucket | null {
  switch (format) {
    case 'TV':
    case 'TV_SHORT':
      return 'tv'
    case 'MOVIE':
      return 'movie'
    case 'OVA':
    case 'ONA':
    case 'SPECIAL':
    case 'MUSIC':
      return 'ova'
    default:
      return null
  }
}

/** Match against all three title variants and every listed studio. */
export function matchesSearch(media: AnimeMedia, query: string): boolean {
  const q = normalizeText(query.trim())
  if (!q) return true
  const haystacks = [
    media.title.romaji,
    media.title.english,
    media.title.native,
    ...media.studios.nodes.map((s) => s.name),
  ]
  return haystacks.some(
    (text) => text != null && normalizeText(text).includes(q),
  )
}

/** AND semantics: the title must carry every selected genre. */
export function matchesGenres(media: AnimeMedia, genres: string[]): boolean {
  return genres.every((g) => media.genres.includes(g))
}

/** Sortable key for a fuzzy date; null when the year is unknown. */
function fuzzyDateKey(date: AniListFuzzyDate): number | null {
  if (!date.year) return null
  return date.year * 10000 + (date.month ?? 1) * 100 + (date.day ?? 1)
}

/**
 * Compare two nullable numbers. Missing values always sort last, regardless
 * of direction: an unknown score is not a low score.
 */
function cmpNullable(a: number | null, b: number | null, flip: 1 | -1): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return (a - b) * flip
}

const cmpTitle = (a: AnimeMedia, b: AnimeMedia): number =>
  pickTitle(a.title).localeCompare(pickTitle(b.title), 'id', {
    sensitivity: 'base',
  })

/** Comparator factory. Each key has tiebreakers so ordering is deterministic. */
export function compareBy(
  sort: SortKey,
  dir: SortDir,
): (a: AnimeMedia, b: AnimeMedia) => number {
  const flip: 1 | -1 = dir === 'asc' ? 1 : -1
  switch (sort) {
    case 'popularity':
      return (a, b) =>
        cmpNullable(a.popularity, b.popularity, flip) || cmpTitle(a, b)
    case 'score':
      return (a, b) =>
        cmpNullable(a.averageScore, b.averageScore, flip) ||
        cmpNullable(a.popularity, b.popularity, -1) ||
        cmpTitle(a, b)
    case 'countdown':
      // Shows without a scheduled episode go last, ordered by start date.
      return (a, b) =>
        cmpNullable(
          a.nextAiringEpisode?.airingAt ?? null,
          b.nextAiringEpisode?.airingAt ?? null,
          flip,
        ) ||
        cmpNullable(fuzzyDateKey(a.startDate), fuzzyDateKey(b.startDate), 1) ||
        cmpNullable(a.popularity, b.popularity, -1)
    case 'title':
      return (a, b) => cmpTitle(a, b) * flip
    case 'start':
      return (a, b) =>
        cmpNullable(
          fuzzyDateKey(a.startDate),
          fuzzyDateKey(b.startDate),
          flip,
        ) ||
        cmpNullable(a.popularity, b.popularity, -1) ||
        cmpTitle(a, b)
  }
}

/** Run the full pipeline. Returns a new array; never mutates the input. */
export function applyFilters(
  media: AnimeMedia[],
  filters: SeasonFilters,
): AnimeMedia[] {
  return media
    .filter(
      (m) =>
        (filters.includeAdult || !m.isAdult) &&
        (filters.format === 'all' ||
          formatBucketOf(m.format) === filters.format) &&
        matchesSearch(m, filters.q) &&
        matchesGenres(m, filters.genres),
    )
    .sort(compareBy(filters.sort, filters.dir))
}

/** Alphabetical genre facet with counts, derived from the given titles. */
export function deriveGenreCounts(
  media: AnimeMedia[],
): Array<{ genre: string; count: number }> {
  const counts = new Map<string, number>()
  for (const m of media) {
    for (const g of m.genres) counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => a.genre.localeCompare(b.genre))
}
