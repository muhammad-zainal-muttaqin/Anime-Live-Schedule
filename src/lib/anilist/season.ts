/**
 * Season helpers shared by client + server.
 *
 * We use the "standard" anime-season calendar (matches how seasonal charts
 * are usually presented):
 *   winter = Jan–Mar, spring = Apr–Jun, summer = Jul–Sep, fall = Oct–Dec
 */

export const SEASONS = ['winter', 'spring', 'summer', 'fall'] as const
export type Season = (typeof SEASONS)[number]

/** AniList's `MediaSeason` enum values. */
export type ApiSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL'

export const SEASON_LABELS: Record<Season, string> = {
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
}

export const SEASON_EMOJI: Record<Season, string> = {
  winter: '❄️',
  spring: '🌸',
  summer: '☀️',
  fall: '🍁',
}

/** Oldest year offered in the picker. AniList data thins out before this. */
export const MIN_YEAR = 1960

export function isSeason(value: unknown): value is Season {
  return typeof value === 'string' && (SEASONS as readonly string[]).includes(value)
}

export function seasonToApi(season: Season): ApiSeason {
  return season.toUpperCase() as ApiSeason
}

/** Which season the given date falls in. */
export function getCurrentSeason(now: Date = new Date()): { season: Season; year: number } {
  const month = now.getUTCMonth() // 0-11
  const year = now.getUTCFullYear()
  const season: Season =
    month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'fall'
  return { season, year }
}

/** Newest year offered in the picker (one ahead, so upcoming seasons show). */
export function getMaxYear(now: Date = new Date()): number {
  return now.getUTCFullYear() + 1
}

/** Descending list of years for the picker (newest first). */
export function getYearList(now: Date = new Date()): number[] {
  const max = getMaxYear(now)
  const years: number[] = []
  for (let y = max; y >= MIN_YEAR; y--) years.push(y)
  return years
}

/** Step to the previous/next season, rolling the year over at the boundaries. */
export function shiftSeason(
  season: Season,
  year: number,
  direction: 1 | -1,
): { season: Season; year: number } {
  const idx = SEASONS.indexOf(season)
  const nextIdx = idx + direction
  if (nextIdx < 0) return { season: 'fall', year: year - 1 }
  if (nextIdx > 3) return { season: 'winter', year: year + 1 }
  return { season: SEASONS[nextIdx], year }
}
