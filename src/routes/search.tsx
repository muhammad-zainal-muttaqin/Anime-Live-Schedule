import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Search, Tv, X } from 'lucide-react'
import { pickTitle } from '#/lib/format'
import type { SearchIndexEntry } from '#/lib/anilist/types'
import { searchAnime } from '#/server/anilist'

export const Route = createFileRoute('/search')({
  component: SearchPage,
})

const CONTAINER = 'mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8'
const GRID = 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'

function SearchPage() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchIndexEntry[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(timer.current)
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    timer.current = setTimeout(async () => {
      try {
        const res = await searchAnime({ data: { q: trimmed } })
        setResults(res ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer.current)
  }, [q])

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <div className="season-ambient min-h-dvh bg-bg" data-season="spring">
      <div className={`${CONTAINER} pt-6`}>
        <header className="flex items-center gap-3">
          <Link
            to="/"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-strong text-accent-ink shadow-lg shadow-black/30 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            aria-label="Beranda"
          >
            <Tv className="h-5 w-5" />
          </Link>
          <Link to="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring rounded">
            <h1 className="text-lg font-bold tracking-tight text-ink">AnimeSeasons</h1>
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
            placeholder="Cari anime…"
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

        {loading ? (
          <div className="mt-8 text-center text-sm text-ink-muted">Mencari…</div>
        ) : results.length > 0 ? (
          <>
            <p className="mt-6 text-sm text-ink-subtle">
              <span className="font-semibold tabular-nums text-ink-muted">{results.length}</span> judul
            </p>
            <div className={`mt-5 ${GRID}`}>
              {results.map((anime) => (
                <SearchCard key={anime.id} anime={anime} />
              ))}
            </div>
          </>
        ) : q.trim().length >= 2 ? (
          <div className="mt-16 text-center text-sm text-ink-subtle">
            Tidak ada judul yang cocok dengan “{q}”
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SearchCard({ anime }: { anime: SearchIndexEntry }) {
  const seasonLabel = SEASON_LABELS[anime.season as keyof typeof SEASON_LABELS] ?? anime.season
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