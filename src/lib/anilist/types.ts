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
  timeUntilAiring: number // seconds (as of fetch time; recompute on client)
  episode: number
}

export interface Studio {
  id: number
  name: string
}

/** The fields we pull for each card in the grid. */
export interface AnimeMedia {
  id: number
  title: AniListTitle
  /** Alternate titles from AniList (romanizations, abbreviations). Kept in the
   *  snapshot because the search index is built from it. Optional: snapshots
   *  cached before this field existed lack it. */
  synonyms?: string[]
  coverImage: AniListCoverImage
  genres: string[]
  averageScore: number | null
  popularity: number | null
  episodes: number | null
  duration: number | null
  status: string | null
  format: string | null
  startDate: AniListFuzzyDate
  studios: { nodes: Studio[] }
  nextAiringEpisode: NextAiringEpisode | null
  isAdult: boolean
  /** Optional: season snapshots cached before these fields existed lack them. */
  source?: string | null
  /** Plain text, truncated for the card/list preview (full text on detail). */
  description?: string | null
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

/** The richer payload used by the detail modal; includes the fields the lean
 *  seasonal snapshot omits (only `bannerImage` is actually rendered). */
export interface AnimeDetail extends AnimeMedia {
  bannerImage: string | null
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

/** Minimal entry in the cross-season search index. */
export interface SearchIndexEntry {
  id: number
  title: string
  season: string
  year: number
  /** Cover filename only (e.g. `bx123-abc.jpg`); the full CDN URL is rebuilt in
   *  the client. May be a full URL for non-standard covers, or null. */
  coverImage: string | null
  format: string | null
  /** Omitted entirely when AniList has no score (saves index bytes). */
  averageScore?: number | null
  /** Ranking signal; higher sorts first. Optional on pre-enrichment indexes. */
  popularity?: number | null
  /** Other searchable titles (romaji/native/english/synonyms), minus `title`. */
  alt?: string[]
}
