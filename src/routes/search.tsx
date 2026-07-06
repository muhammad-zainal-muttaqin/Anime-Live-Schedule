import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Search, Tv, X } from 'lucide-react'
import { getCurrentSeason } from '#/lib/anilist/season'
import { normalizeText } from '#/lib/text'
import type { SearchIndexEntry } from '#/lib/anilist/types'

export const Route = createFileRoute('/search')({
  component: SearchPage,
})

const CONTAINER = 'mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8'
const GRID =
  'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
const MAX_RESULTS = 60
const POPULAR_COUNT = 24

// The index stores cover filenames only; rebuild the CDN URL here. Older index
// entries may still hold a full URL; pass those through unchanged.
const COVER_URL_PREFIX =
  'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/'
function coverUrl(cover: string | null): string | null {
  if (!cover) return null
  return cover.startsWith('http') ? cover : COVER_URL_PREFIX + cover
}

let indexPromise: Promise<SearchIndexEntry[]> | null = null

function loadIndex(): Promise<SearchIndexEntry[]> {
  if (!indexPromise) {
    indexPromise = fetch('/search-index.json').then((r) => {
      if (!r.ok) throw new Error('Failed to load search index')
      return r.json()
    })
  }
  return indexPromise
}

/** An index entry with its titles pre-normalized for matching. */
interface Prepared {
  entry: SearchIndexEntry
  /** Normalized display title + every alternate title, for substring matching. */
  hay: string[]
  /** popularity with a numeric floor so it always sorts. */
  pop: number
}

// Relevance tiers (lower = better). A numeric year hit ranks below every text hit.
const RANK_EXACT = 0
const RANK_PREFIX = 1
const RANK_WORD = 2
const RANK_SUBSTR = 3
const RANK_YEAR = 4

/**
 * How one entry matched the query. Ties inside a tier are broken (in order) by:
 * `alt` (0 = the display title itself matched; matching only an alternate
 * title ranks after it) then `close` (query length / matched-title length,
 * so "JUJUTSU KAISEN" beats "JUJUTSU KAISEN Season 2" for "jujutsu": the
 * shorter, more identical title wins). Popularity only decides what's left.
 */
interface Ranked {
  r: number
  alt: 0 | 1
  close: number
}

/** Best relevance across an entry's titles (+ year fallback); null = no match. */
function rankOf(hay: string[], nq: string, year: number): Ranked | null {
  let best: Ranked | null = null
  for (let i = 0; i < hay.length; i++) {
    const h = hay[i]
    let r: number
    if (h === nq) r = RANK_EXACT
    else if (h.startsWith(nq)) r = RANK_PREFIX
    else if (` ${h}`.includes(` ${nq}`)) r = RANK_WORD
    else if (h.includes(nq)) r = RANK_SUBSTR
    else continue
    const cand: Ranked = {
      r,
      alt: i === 0 ? 0 : 1,
      close: nq.length / h.length,
    }
    if (
      !best ||
      cand.r < best.r ||
      (cand.r === best.r &&
        (cand.alt < best.alt ||
          (cand.alt === best.alt && cand.close > best.close)))
    ) {
      best = cand
    }
  }
  if (!best && /^\d{2,4}$/.test(nq) && String(year).includes(nq)) {
    return { r: RANK_YEAR, alt: 1, close: 0 }
  }
  return best
}

/** Back to wherever the user came from, or home if they deep-linked here. */
function BackButton() {
  const router = useRouter()
  const onBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.history.back()
    } else {
      void router.navigate({ to: '/' })
    }
  }
  return (
    <button
      type="button"
      onClick={onBack}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-muted transition hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
      aria-label="Kembali"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  )
}

function SearchPage() {
  const [q, setQ] = useState('')
  const [deferredQ, setDeferredQ] = useState('')
  const [index, setIndex] = useState<SearchIndexEntry[] | null>(null)
  const [failed, setFailed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // Tint the cross-season page with the current season's accent for continuity
  // with the schedule the user just came from.
  const season = useMemo(() => getCurrentSeason().season, [])

  // Load the static index once on mount.
  useEffect(() => {
    let alive = true
    loadIndex()
      .then((data) => alive && setIndex(data))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [])

  // Debounce the query so we don't re-rank on every keystroke.
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setDeferredQ(q), 150)
    return () => clearTimeout(timer.current)
  }, [q])

  // Pre-normalize every entry's titles once; reused across queries.
  const prepared = useMemo<Prepared[]>(() => {
    if (!index) return []
    return index.map((entry) => ({
      entry,
      hay: [entry.title, ...(entry.alt ?? [])].map(normalizeText),
      pop: entry.popularity ?? 0,
    }))
  }, [index])

  // Empty-state suggestions: the most popular titles across all seasons.
  const popular = useMemo<SearchIndexEntry[]>(() => {
    return [...prepared]
      .sort((a, b) => b.pop - a.pop)
      .slice(0, POPULAR_COUNT)
      .map((p) => p.entry)
  }, [prepared])

  const results = useMemo<SearchIndexEntry[]>(() => {
    const nq = normalizeText(deferredQ.trim())
    if (nq.length < 2) return []
    const scored: Array<{ p: Prepared; m: Ranked }> = []
    for (const p of prepared) {
      const m = rankOf(p.hay, nq, p.entry.year)
      if (m) scored.push({ p, m })
    }
    // Tier, then display-title match, then title closeness; popularity and
    // score only settle what's still tied (see Ranked above).
    scored.sort(
      (a, b) =>
        a.m.r - b.m.r ||
        a.m.alt - b.m.alt ||
        b.m.close - a.m.close ||
        b.p.pop - a.p.pop ||
        (b.p.entry.averageScore ?? 0) - (a.p.entry.averageScore ?? 0) ||
        a.p.entry.title.localeCompare(b.p.entry.title),
    )
    return scored.slice(0, MAX_RESULTS).map((s) => s.p.entry)
  }, [deferredQ, prepared])

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const searching = q.trim().length >= 2

  return (
    <div className="season-ambient min-h-dvh bg-bg" data-season={season}>
      {/* Header + search field stick to the top so results scroll under them. */}
      <div className="sticky top-0 z-30 border-b border-border bg-canvas/80 backdrop-blur-md">
        <div className={`${CONTAINER} py-4`}>
          <header className="flex items-center gap-3">
            <BackButton />
            <Link
              to="/"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-strong text-accent-ink shadow-lg shadow-black/30 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              aria-label="Beranda"
            >
              <Tv className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight tracking-tight text-ink">
                Cari anime
              </h1>
              <p className="truncate text-xs text-ink-subtle">
                Semua musim · data AniList
              </p>
            </div>
          </header>

          <div className="relative mt-3">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted"
            />
            <input
              ref={inputRef}
              type="text"
              enterKeyHint="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Judul apa pun: Jepang, Inggris, atau singkatan…"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-surface py-3 pl-12 pr-10 text-[15px] text-ink shadow-sm outline-none transition placeholder:text-ink-muted focus:border-accent-ring focus:ring-2 focus:ring-accent-soft"
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ('')
                  inputRef.current?.focus()
                }}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`${CONTAINER} py-6`}>
        {failed ? (
          <EmptyMessage
            title="Gagal memuat indeks pencarian"
            body="Coba refresh halaman sebentar lagi."
          />
        ) : searching ? (
          !index ? (
            <PosterSkeletonGrid />
          ) : results.length > 0 ? (
            <>
              <SectionLabel>
                <span className="font-semibold tabular-nums text-ink-muted">
                  {results.length}
                </span>
                {results.length === MAX_RESULTS ? ' judul teratas' : ' judul'}
              </SectionLabel>
              <div className={`stagger-children cv-cards mt-4 ${GRID}`}>
                {results.map((anime) => (
                  <SearchCard key={anime.id} anime={anime} />
                ))}
              </div>
            </>
          ) : (
            <EmptyMessage
              title="Tidak ada judul yang cocok"
              body={`Tidak ada hasil untuk “${q.trim()}”. Coba ejaan lain atau judul alternatifnya.`}
            />
          )
        ) : (
          <>
            <SectionLabel>Populer</SectionLabel>
            {!index ? (
              <PosterSkeletonGrid />
            ) : (
              <div className={`stagger-children cv-cards mt-4 ${GRID}`}>
                {popular.map((anime) => (
                  <SearchCard key={anime.id} anime={anime} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-subtle">{children}</p>
}

function EmptyMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-2 text-center">
      <span className="mb-1 grid h-12 w-12 place-items-center rounded-2xl bg-surface ring-1 ring-border">
        <Search aria-hidden className="h-6 w-6 text-ink-subtle" />
      </span>
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="text-sm text-pretty text-ink-subtle">{body}</p>
    </div>
  )
}

function PosterSkeletonGrid() {
  return (
    <>
      <div className="h-4 w-24 animate-pulse rounded bg-surface" />
      <div className={`mt-4 ${GRID}`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[2/3] animate-pulse rounded-2xl bg-surface-2" />
            <div className="mt-2 h-3.5 w-4/5 animate-pulse rounded bg-surface-2" />
            <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-surface" />
          </div>
        ))}
      </div>
    </>
  )
}

function SearchCard({ anime }: { anime: SearchIndexEntry }) {
  const seasonLabel = SEASON_LABELS[anime.season] ?? anime.season
  const cover = coverUrl(anime.coverImage)
  return (
    <Link
      to="/$season/$year/$id"
      params={{
        season: anime.season,
        year: String(anime.year),
        id: String(anime.id),
      }}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring rounded-2xl"
    >
      <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-border transition group-hover:ring-accent-ring group-focus-visible:ring-accent-ring">
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-subtle">
            <Tv className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="mt-2 space-y-0.5 px-0.5">
        <p className="line-clamp-2 text-sm font-medium leading-tight text-ink group-hover:text-accent-strong transition-colors">
          {anime.title}
        </p>
        <p className="text-xs text-ink-subtle">
          {seasonLabel} {anime.year}
          {anime.averageScore ? (
            <span className="ml-1.5 text-accent-strong">
              ★ {anime.averageScore}
            </span>
          ) : null}
        </p>
      </div>
    </Link>
  )
}

const SEASON_LABELS: Record<string, string> = {
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
}
