import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Search, Tv, X } from 'lucide-react'
import { normalizeText } from '#/lib/text'
import type { SearchIndexEntry } from '#/lib/anilist/types'

export const Route = createFileRoute('/search')({
  component: SearchPage,
})

const CONTAINER = 'mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8'
const GRID = 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
const MAX_RESULTS = 60
const POPULAR_COUNT = 24

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
const NO_MATCH = 99

/** Best relevance tier for a query across an entry's titles (+ year fallback). */
function rankOf(hay: string[], nq: string, year: number): number {
  let best = NO_MATCH
  for (const h of hay) {
    if (h === nq) return RANK_EXACT
    if (h.startsWith(nq)) best = Math.min(best, RANK_PREFIX)
    else if (`${' '}${h}`.includes(`${' '}${nq}`)) best = Math.min(best, RANK_WORD)
    else if (h.includes(nq)) best = Math.min(best, RANK_SUBSTR)
  }
  if (best === NO_MATCH && /^\d{2,4}$/.test(nq) && String(year).includes(nq)) {
    return RANK_YEAR
  }
  return best
}

function BackButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.history.back()}
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
    const scored: Array<{ p: Prepared; r: number }> = []
    for (const p of prepared) {
      const r = rankOf(p.hay, nq, p.entry.year)
      if (r !== NO_MATCH) scored.push({ p, r })
    }
    scored.sort(
      (a, b) =>
        a.r - b.r ||
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

  const trimmed = q.trim()
  const searching = trimmed.length >= 2
  // "Loading" only while a query is pending and the index hasn't arrived yet.
  const loading = searching && !index && !failed

  return (
    <div className="season-ambient min-h-dvh bg-bg" data-season="spring">
      <div className={`${CONTAINER} pt-6`}>
        <header className="flex items-center gap-3">
          <BackButton />
          <Link
            to="/"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-strong text-accent-ink shadow-lg shadow-black/30 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            aria-label="Beranda"
          >
            <Tv className="h-5 w-5" />
          </Link>
          <Link to="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring rounded">
            <h1 className="text-lg font-bold tracking-tight text-ink">Cari anime</h1>
          </Link>
        </header>
      </div>

      <div className={`${CONTAINER} mt-8`}>
        <div className="relative mx-auto max-w-xl">
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul apa pun — Jepang, Inggris, atau singkatan…"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full rounded-xl border border-border bg-surface py-3 pl-12 pr-10 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-accent-ring focus:ring-2 focus:ring-accent-ring"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="Hapus pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {failed ? (
          <div className="mt-16 text-center text-sm text-ink-subtle">
            Gagal memuat indeks pencarian. Coba refresh halaman.
          </div>
        ) : loading ? (
          <div className="mt-8 text-center text-sm text-ink-muted">Mencari…</div>
        ) : searching ? (
          results.length > 0 ? (
            <>
              <p className="mt-6 text-sm text-ink-subtle">
                <span className="font-semibold tabular-nums text-ink-muted">{results.length}</span> judul
                {results.length === MAX_RESULTS ? ' teratas' : ''}
              </p>
              <div className={`mt-5 ${GRID}`}>
                {results.map((anime) => (
                  <SearchCard key={anime.id} anime={anime} />
                ))}
              </div>
            </>
          ) : (
            <div className="mt-16 text-center text-sm text-ink-subtle">
              Tidak ada judul yang cocok dengan “{q}”
            </div>
          )
        ) : popular.length > 0 ? (
          <>
            <p className="mt-6 text-sm font-medium text-ink-muted">Populer</p>
            <div className={`mt-5 ${GRID}`}>
              {popular.map((anime) => (
                <SearchCard key={anime.id} anime={anime} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function SearchCard({ anime }: { anime: SearchIndexEntry }) {
  const seasonLabel = SEASON_LABELS[anime.season] ?? anime.season
  return (
    <Link
      to="/$season/$year/$id"
      params={{ season: anime.season, year: String(anime.year), id: String(anime.id) }}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring rounded-2xl"
    >
      <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-border transition group-hover:ring-accent-ring group-focus-visible:ring-accent-ring">
        {anime.coverImage ? (
          <img
            src={anime.coverImage}
            alt=""
            loading="lazy"
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
          {anime.averageScore ? <span className="ml-1.5 text-accent-strong">★ {anime.averageScore}</span> : null}
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
