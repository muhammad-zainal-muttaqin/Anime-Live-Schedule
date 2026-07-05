import { describe, expect, it } from 'vitest'
import {
  applyFilters,
  compareBy,
  deriveGenreCounts,
  formatBucketOf,
  hasActiveFilters,
  matchesGenres,
  matchesSearch,
  parseSearch,
  resolveFilters,
  truncatePlain,
  withGenreToggled,
} from '#/lib/filter'
import type { AnimeMedia } from '#/lib/anilist/types'

let nextId = 1

function makeMedia(overrides: Partial<AnimeMedia> = {}): AnimeMedia {
  return {
    id: nextId++,
    idMal: null,
    title: { romaji: 'Romaji Title', english: null, native: null },
    coverImage: { extraLarge: null, large: null, color: null },
    bannerImage: null,
    genres: [],
    averageScore: null,
    popularity: null,
    episodes: null,
    duration: null,
    status: null,
    format: 'TV',
    season: 'SUMMER',
    seasonYear: 2026,
    startDate: { year: null, month: null, day: null },
    studios: { nodes: [] },
    nextAiringEpisode: null,
    isAdult: false,
    ...overrides,
  }
}

describe('formatBucketOf', () => {
  it('maps AniList formats into toolbar buckets', () => {
    expect(formatBucketOf('TV')).toBe('tv')
    expect(formatBucketOf('TV_SHORT')).toBe('tv')
    expect(formatBucketOf('MOVIE')).toBe('movie')
    expect(formatBucketOf('OVA')).toBe('ova')
    expect(formatBucketOf('ONA')).toBe('ova')
    expect(formatBucketOf('SPECIAL')).toBe('ova')
    expect(formatBucketOf('MUSIC')).toBe('ova')
  })

  it('returns null for unknown or missing formats', () => {
    expect(formatBucketOf(null)).toBeNull()
    expect(formatBucketOf('SOMETHING_NEW')).toBeNull()
  })
})

describe('parseSearch', () => {
  it('coerces garbage to defaults without throwing', () => {
    const parsed = parseSearch({ q: 42, format: 'nope', sort: 'zzz', dir: 'up', view: [], genre: 9 })
    expect(parsed).toEqual({
      q: '',
      format: 'all',
      genre: '',
      sort: 'popularity',
      dir: undefined,
      view: 'grid',
    })
  })

  it('keeps valid values', () => {
    const parsed = parseSearch({ q: 'frieren', format: 'tv', genre: 'Action,Comedy', sort: 'score', view: 'list' })
    expect(parsed).toEqual({
      q: 'frieren',
      format: 'tv',
      genre: 'Action,Comedy',
      sort: 'score',
      dir: undefined,
      view: 'list',
    })
  })

  it('strips dir when it equals the natural direction of the sort', () => {
    expect(parseSearch({ sort: 'score', dir: 'desc' }).dir).toBeUndefined()
    expect(parseSearch({ sort: 'score', dir: 'asc' }).dir).toBe('asc')
    expect(parseSearch({ sort: 'title', dir: 'asc' }).dir).toBeUndefined()
    expect(parseSearch({ sort: 'title', dir: 'desc' }).dir).toBe('desc')
  })
})

describe('resolveFilters', () => {
  it('splits genres and resolves the natural direction', () => {
    const filters = resolveFilters({ genre: 'Action,Comedy', sort: 'countdown' })
    expect(filters.genres).toEqual(['Action', 'Comedy'])
    expect(filters.dir).toBe('asc')
    expect(filters.format).toBe('all')
  })

  it('round-trips a genre through toggle → param string', () => {
    const filters = resolveFilters({ genre: 'Action' })
    expect(withGenreToggled(filters, 'Comedy')).toBe('Action,Comedy')
    expect(withGenreToggled(filters, 'Action')).toBe('')
  })
})

describe('hasActiveFilters', () => {
  it('ignores the view mode', () => {
    expect(hasActiveFilters(resolveFilters({ view: 'list' }))).toBe(false)
    expect(hasActiveFilters(resolveFilters({}))).toBe(false)
  })

  it('detects each deviation', () => {
    expect(hasActiveFilters(resolveFilters({ q: 'x' }))).toBe(true)
    expect(hasActiveFilters(resolveFilters({ format: 'tv' }))).toBe(true)
    expect(hasActiveFilters(resolveFilters({ genre: 'Action' }))).toBe(true)
    expect(hasActiveFilters(resolveFilters({ sort: 'title' }))).toBe(true)
    expect(hasActiveFilters(resolveFilters({ dir: 'asc' }))).toBe(true)
  })
})

describe('matchesSearch', () => {
  const media = makeMedia({
    title: { romaji: 'Sousou no Frieren', english: 'Frieren: Beyond Journey’s End', native: '葬送のフリーレン' },
    studios: { nodes: [{ id: 1, name: 'Madhouse' }] },
  })

  it('matches any title variant, case-insensitively', () => {
    expect(matchesSearch(media, 'FRIEREN')).toBe(true)
    expect(matchesSearch(media, 'sousou')).toBe(true)
    expect(matchesSearch(media, 'フリーレン')).toBe(true)
    expect(matchesSearch(media, 'bocchi')).toBe(false)
  })

  it('matches studio names', () => {
    expect(matchesSearch(media, 'madhouse')).toBe(true)
  })

  it('is diacritic-insensitive', () => {
    const macron = makeMedia({ title: { romaji: 'Ōoku', english: null, native: null } })
    expect(matchesSearch(macron, 'ooku')).toBe(true)
  })

  it('treats blank queries as match-all', () => {
    expect(matchesSearch(media, '')).toBe(true)
    expect(matchesSearch(media, '   ')).toBe(true)
  })
})

describe('matchesGenres', () => {
  it('requires every selected genre (AND)', () => {
    const media = makeMedia({ genres: ['Action', 'Comedy'] })
    expect(matchesGenres(media, [])).toBe(true)
    expect(matchesGenres(media, ['Action'])).toBe(true)
    expect(matchesGenres(media, ['Action', 'Comedy'])).toBe(true)
    expect(matchesGenres(media, ['Action', 'Drama'])).toBe(false)
  })
})

describe('deriveGenreCounts', () => {
  it('counts and sorts alphabetically', () => {
    const list = [
      makeMedia({ genres: ['Comedy', 'Action'] }),
      makeMedia({ genres: ['Action'] }),
      makeMedia({ genres: [] }),
    ]
    expect(deriveGenreCounts(list)).toEqual([
      { genre: 'Action', count: 2 },
      { genre: 'Comedy', count: 1 },
    ])
  })
})

describe('compareBy', () => {
  it('popularity: sorts desc by default, missing values last in both directions', () => {
    const a = makeMedia({ popularity: 100 })
    const b = makeMedia({ popularity: 500 })
    const missing = makeMedia({ popularity: null })
    const desc = [a, missing, b].sort(compareBy('popularity', 'desc'))
    expect(desc.map((m) => m.popularity)).toEqual([500, 100, null])
    const asc = [a, missing, b].sort(compareBy('popularity', 'asc'))
    expect(asc.map((m) => m.popularity)).toEqual([100, 500, null])
  })

  it('score: null scores sort last, ties broken by popularity desc', () => {
    const high = makeMedia({ averageScore: 86, popularity: 10 })
    const tiedPopular = makeMedia({ averageScore: 80, popularity: 900 })
    const tiedNiche = makeMedia({ averageScore: 80, popularity: 20 })
    const unscored = makeMedia({ averageScore: null, popularity: 99999 })
    const sorted = [unscored, tiedNiche, high, tiedPopular].sort(compareBy('score', 'desc'))
    expect(sorted).toEqual([high, tiedPopular, tiedNiche, unscored])
  })

  it('countdown: soonest first, unscheduled shows last ordered by start date', () => {
    const soon = makeMedia({ nextAiringEpisode: { airingAt: 1000, timeUntilAiring: 0, episode: 2 } })
    const later = makeMedia({ nextAiringEpisode: { airingAt: 5000, timeUntilAiring: 0, episode: 1 } })
    const unscheduledEarly = makeMedia({ startDate: { year: 2026, month: 7, day: 1 } })
    const unscheduledLate = makeMedia({ startDate: { year: 2026, month: 9, day: 1 } })
    const sorted = [unscheduledLate, later, unscheduledEarly, soon].sort(compareBy('countdown', 'asc'))
    expect(sorted).toEqual([soon, later, unscheduledEarly, unscheduledLate])
  })

  it('title: locale-aware and case-insensitive', () => {
    const a = makeMedia({ title: { romaji: 'bocchi the rock', english: null, native: null } })
    const b = makeMedia({ title: { romaji: 'Akira', english: null, native: null } })
    expect([a, b].sort(compareBy('title', 'asc'))[0]).toBe(b)
    expect([a, b].sort(compareBy('title', 'desc'))[0]).toBe(a)
  })

  it('start: handles fuzzy dates with missing month/day, null years last', () => {
    const january = makeMedia({ startDate: { year: 2026, month: 1, day: 15 } })
    const yearOnly = makeMedia({ startDate: { year: 2026, month: null, day: null } })
    const unknown = makeMedia({ startDate: { year: null, month: null, day: null } })
    const sorted = [january, unknown, yearOnly].sort(compareBy('start', 'asc'))
    expect(sorted).toEqual([yearOnly, january, unknown])
  })
})

describe('applyFilters', () => {
  const media = [
    makeMedia({ format: 'TV', genres: ['Action'], popularity: 100, title: { romaji: 'Alpha', english: null, native: null } }),
    makeMedia({ format: 'MOVIE', genres: ['Action', 'Drama'], popularity: 300, title: { romaji: 'Beta', english: null, native: null } }),
    makeMedia({ format: 'ONA', genres: ['Comedy'], popularity: 200, title: { romaji: 'Gamma', english: null, native: null } }),
  ]

  it('combines format, search, and genre filters then sorts', () => {
    const out = applyFilters(media, resolveFilters({ genre: 'Action' }))
    expect(out.map((m) => m.title.romaji)).toEqual(['Beta', 'Alpha'])
  })

  it('filters by format bucket', () => {
    const out = applyFilters(media, resolveFilters({ format: 'ova' }))
    expect(out.map((m) => m.title.romaji)).toEqual(['Gamma'])
  })

  it('never mutates the input array', () => {
    const original = [...media]
    applyFilters(media, resolveFilters({ sort: 'title' }))
    expect(media).toEqual(original)
  })
})

describe('truncatePlain', () => {
  it('passes short input through untouched', () => {
    expect(truncatePlain('short text')).toBe('short text')
  })

  it('cuts at a word boundary and appends an ellipsis', () => {
    const out = truncatePlain('lorem ipsum dolor sit amet consectetur', 20)
    expect(out).toBe('lorem ipsum dolor…')
    expect(out.length).toBeLessThanOrEqual(21)
  })

  it('hard-cuts when there is no usable space', () => {
    const out = truncatePlain('a'.repeat(50), 20)
    expect(out).toBe(`${'a'.repeat(20)}…`)
  })
})
