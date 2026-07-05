import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { fetchSeasonalPaged } from '#/lib/anilist/client'
import { seedSeason } from '#/server/anilist'
import {
  SEASON_EMOJI,
  SEASON_LABELS,
  getCurrentSeason,
  shiftSeason,
  type Season,
} from '#/lib/anilist/season'

export const Route = createFileRoute('/seed')({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  component: SeedRoute,
})

/** Seasons to refresh: the current season and the next four upcoming ones. */
function seedWindow(): Array<{ season: Season; year: number }> {
  const list: Array<{ season: Season; year: number }> = []
  let cursor = getCurrentSeason()
  for (let i = 0; i < 5; i++) {
    list.push(cursor)
    cursor = shiftSeason(cursor.season, cursor.year, 1)
  }
  return list
}

type Status = 'idle' | 'fetching' | 'writing' | 'done' | 'error'

interface Row {
  season: Season
  year: number
  status: Status
  detail: string
}

function SeedRoute() {
  const { token } = Route.useSearch()
  const [rows, setRows] = useState<Row[]>(() =>
    seedWindow().map((s) => ({ ...s, status: 'idle', detail: '' })),
  )
  const [running, setRunning] = useState(false)

  const update = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  async function run() {
    setRunning(true)
    for (let i = 0; i < rows.length; i++) {
      const { season, year } = rows[i]
      try {
        update(i, { status: 'fetching', detail: 'Mengambil dari AniList…' })
        const result = await fetchSeasonalPaged(season, year)
        update(i, { status: 'writing', detail: `${result.media.length} judul → KV…` })
        const res = await seedSeason({ data: { token: token ?? '', season, year, result } })
        update(i, { status: 'done', detail: `${res.count} judul tersimpan` })
      } catch (err) {
        update(i, {
          status: 'error',
          detail: err instanceof Error ? err.message : 'Gagal',
        })
      }
      // Gentle pacing so AniList's 90 req/min limit is never in reach.
      await new Promise((r) => setTimeout(r, 700))
    }
    setRunning(false)
  }

  const doneCount = rows.filter((r) => r.status === 'done').length

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Refresh data musim
          </h1>
          <p className="text-sm text-ink-muted text-pretty">
            Menyegarkan musim sekarang dan empat musim mendatang: data diambil langsung
            dari AniList lewat browser kamu, lalu disimpan ke cache Cloudflare KV. Musim
            lama sudah di-seed sekali dan tidak berubah, jadi tak perlu di sini.
          </p>
        </header>

        {!token ? (
          <p className="mt-6 rounded-lg bg-surface px-4 py-3 text-sm text-ink-subtle ring-1 ring-border">
            Tambahkan token di URL:{' '}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-ink">?token=…</code>
          </p>
        ) : null}

        <button
          type="button"
          onClick={run}
          disabled={running || !token}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent-strong px-4 py-2 text-sm font-semibold text-accent-ink transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? 'Menyeed…' : 'Seed sekarang'}
        </button>

        <ol className="mt-8 space-y-2">
          {rows.map((r) => (
            <li
              key={`${r.season}-${r.year}`}
              className="flex items-center justify-between gap-3 rounded-lg bg-surface px-4 py-3 ring-1 ring-border"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <span aria-hidden>{SEASON_EMOJI[r.season]}</span>
                {SEASON_LABELS[r.season]} {r.year}
              </span>
              <span className={`text-xs tabular-nums ${statusTone(r.status)}`}>
                {r.detail || labelFor(r.status)}
              </span>
            </li>
          ))}
        </ol>

        {doneCount > 0 && !running ? (
          <p className="mt-6 text-sm text-ink-muted">
            Selesai — {doneCount} musim disegarkan. Buka halaman utama untuk melihat
            hasilnya.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function labelFor(status: Status): string {
  switch (status) {
    case 'idle':
      return 'Menunggu'
    case 'fetching':
      return 'Mengambil…'
    case 'writing':
      return 'Menyimpan…'
    case 'done':
      return 'Selesai'
    case 'error':
      return 'Gagal'
  }
}

function statusTone(status: Status): string {
  if (status === 'done') return 'text-emerald-400'
  if (status === 'error') return 'text-rose-400'
  if (status === 'idle') return 'text-ink-subtle'
  return 'text-ink-muted'
}
