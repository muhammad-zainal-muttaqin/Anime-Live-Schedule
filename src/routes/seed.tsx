import { createFileRoute } from '@tanstack/react-router'

// ── DISABLED ─────────────────────────────────────────────────────
// /seed page dulu dipakai untuk seed manual dari browser. Sekarang
// seeding otomatis via GitHub Actions cron (scripts/seed-recent.ts),
// jadi halaman ini dinonaktifkan. Kalau mau diaktifkan lagi:
//   1. uncomment semua kode di bawah
//   2. uncomment seedSeason + getSeedToken di src/server/anilist.ts
//   3. set wrangler secret SEED_TOKEN
//
// import { useState } from 'react'
// import { fetchSeasonalPaged } from '#/lib/anilist/client'
// import { seedSeason } from '#/server/anilist'
// import {
//   SEASON_EMOJI,
//   SEASON_LABELS,
//   getCurrentSeason,
//   shiftSeason,
//   type Season,
// } from '#/lib/anilist/season'
//
// ... (full component code dipertahankan di bawah)
// ─────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/seed')({
  component: () => (
    <div className="min-h-dvh bg-bg text-ink flex items-center justify-center">
      <p className="text-sm text-ink-muted">
        Halaman seed dinonaktifkan. Seeding otomatis via GitHub Actions.
      </p>
    </div>
  ),
})
