/**
 * GraphQL query strings for AniList (https://graphql.anilist.co).
 *
 * Everything the grid needs for one season is pulled in a single request
 * (Page + perPage), so one page view = one AniList request, no matter how
 * many titles come back. That's what keeps us comfortably under the
 * 90 requests/minute limit.
 */

/**
 * Lean field set for the seasonal grid snapshot (cached in KV + dehydrated into
 * SSR HTML for ~100 titles). Deliberately omits fields nothing in the grid /
 * list / OG head reads: idMal, bannerImage, season, seasonYear. `synonyms` stays
 * — the search index is built from these results and needs it for alt titles.
 */
const SEASONAL_FIELDS = `
  id
  title { romaji english native }
  synonyms
  coverImage { extraLarge large color }
  genres
  averageScore
  popularity
  episodes
  duration
  status
  format
  startDate { year month day }
  studios(isMain: true) { nodes { id name } }
  nextAiringEpisode { airingAt timeUntilAiring episode }
  isAdult
  source(version: 3)
  description(asHtml: false)
`

/** Full field set for the detail modal — includes what SEASONAL_FIELDS trims. */
const MEDIA_CARD_FIELDS = `
  ${SEASONAL_FIELDS}
  idMal
  bannerImage
  season
  seasonYear
`

export const SEASONAL_QUERY = `
  query Seasonal($season: MediaSeason, $seasonYear: Int, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(
        season: $season
        seasonYear: $seasonYear
        type: ANIME
        sort: POPULARITY_DESC
      ) {
        ${SEASONAL_FIELDS}
      }
    }
  }
`

export const DETAIL_QUERY = `
  query Detail($id: Int) {
    Media(id: $id, type: ANIME) {
      ${MEDIA_CARD_FIELDS}
      trailer { id site thumbnail }
      siteUrl
      hashtag
      externalLinks { id url site type color icon language }
      relations {
        edges {
          relationType(version: 2)
          node {
            id
            title { romaji english native }
            format
            type
            coverImage { medium }
          }
        }
      }
    }
  }
`
