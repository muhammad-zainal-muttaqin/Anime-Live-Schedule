/** Shapes for the slice of AniList data we actually read. */

export interface AniListTitle {
  romaji: string | null
  english: string | null
  native: string | null
}

export interface AniListFuzzyDate {
  year: number | null
  month: number | null
  day: number | null
}

export interface AniListCoverImage {
  extraLarge: string | null
  large: string | null
  color: string | null
}

export interface NextAiringEpisode {
  airingAt: number // unix seconds
  timeUntilAiring: number // seconds (as of fetch time — recompute on client)
  episode: number
}

export interface Studio {
  id: number
  name: string
}

/** The fields we pull for each card in the grid. */
export interface AnimeMedia {
  id: number
  idMal: number | null
  title: AniListTitle
  coverImage: AniListCoverImage
  bannerImage: string | null
  genres: string[]
  averageScore: number | null
  popularity: number | null
  episodes: number | null
  duration: number | null
  status: string | null
  format: string | null
  season: string | null
  seasonYear: number | null
  startDate: AniListFuzzyDate
  studios: { nodes: Studio[] }
  nextAiringEpisode: NextAiringEpisode | null
  isAdult: boolean
}

export interface AniListTrailer {
  id: string | null
  site: string | null
  thumbnail: string | null
}

export interface AniListExternalLink {
  id: number
  url: string
  site: string
  type: string | null
  color: string | null
  icon: string | null
  language: string | null
}

export interface AniListRelationNode {
  id: number
  title: AniListTitle
  format: string | null
  type: string | null
  coverImage: { medium: string | null }
}

export interface AniListRelationEdge {
  relationType: string | null
  node: AniListRelationNode
}

/** The richer payload used by the detail modal. */
export interface AnimeDetail extends AnimeMedia {
  description: string | null
  trailer: AniListTrailer | null
  siteUrl: string | null
  source: string | null
  hashtag: string | null
  externalLinks: AniListExternalLink[]
  relations: { edges: AniListRelationEdge[] }
}

export interface PageInfo {
  total: number
  currentPage: number
  lastPage: number
  hasNextPage: boolean
  perPage: number
}

/** What the seasonal server function returns (and what we cache in KV). */
export interface SeasonalResult {
  pageInfo: PageInfo
  media: AnimeMedia[]
  /** When this snapshot was fetched from AniList (unix ms). */
  fetchedAt: number
}
