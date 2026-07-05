/**
 * GraphQL query strings for AniList (https://graphql.anilist.co).
 *
 * Everything the grid needs for one season is pulled in a single request
 * (Page + perPage), so one page view = one AniList request, no matter how
 * many titles come back. That's what keeps us comfortably under the
 * 90 requests/minute limit.
 */

/** Fields shared by the grid card and the detail view. */
const MEDIA_CARD_FIELDS = `
  id
  idMal
  title { romaji english native }
  coverImage { extraLarge large color }
  bannerImage
  genres
  averageScore
  popularity
  episodes
  duration
  status
  format
  season
  seasonYear
  startDate { year month day }
  studios(isMain: true) { nodes { id name } }
  nextAiringEpisode { airingAt timeUntilAiring episode }
  isAdult
  source(version: 3)
  description(asHtml: false)
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
        ${MEDIA_CARD_FIELDS}
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
