# AnimeSeasons

Daftar tayang anime per **musim** dan **tahun**, lengkap dengan jadwal episode
terbaru dan detail tiap judul. Data bersumber dari **AniList** dan di-cache di
**Cloudflare KV** supaya cepat dan aman dari rate limit AniList (90 req/menit).

## Stack

- **TanStack Start** (React 19, SSR, file-based routing, server functions)
- **TanStack Query** + `@tanstack/react-router-ssr-query` (SSR-aware client cache)
- **Tailwind CSS v4**
- **Cloudflare Workers** + **KV** (via `@cloudflare/vite-plugin`)
- **AniList GraphQL API** sebagai sumber data

## Cara kerja caching

```
Browser ──▶ Server function ──▶ Cloudflare KV ──▶ (miss) AniList GraphQL
                    │                  ▲                       │
                    └── cache hit ─────┘◀── simpan (TTL) ──────┘
```

- `getSeasonalAnime(season, year)` → key `anilist:season:{season}:{year}`, TTL **6 jam**.
  Seluruh season di-page melalui AniList (maks 6 halaman = 300 judul) **hanya saat cache miss**.
- `getAnimeDetail(id)` → key `anilist:media:{id}`, TTL **24 jam**.
- Satu query GraphQL = satu hitungan rate limit, apa pun jumlah datanya. Karena
  hasilnya di-cache, ratusan pengunjung tetap hanya memicu segelintir request ke AniList.

Kode data layer: `src/server/anilist.ts` (server functions + KV), `src/lib/anilist/*`
(query, tipe, helper musim), `src/lib/queries.ts` (React Query options).

## Rute

| Path                 | Isi                                     |
| -------------------- | --------------------------------------- |
| `/`                  | redirect ke musim & tahun berjalan      |
| `/$season/$year`     | grid anime + picker musim/tahun         |
| `/$season/$year/$id` | modal detail (bisa di-deep-link / SSR)  |

`season` = `winter` \| `spring` \| `summer` \| `fall`.

## Menjalankan lokal

```bash
pnpm install
pnpm dev            # http://localhost:3000  (KV diemulasi oleh Miniflare)
```

Perintah lain: `pnpm build`, `pnpm preview`, `pnpm exec tsc --noEmit` (typecheck),
`pnpm generate-routes` (regen route tree).

## Deploy ke Cloudflare

1. Login: `pnpm wrangler login`
2. Buat KV namespace dan salin `id` yang dikembalikan:
   ```bash
   pnpm wrangler kv namespace create CACHE
   ```
3. Tempel `id` tersebut ke `wrangler.jsonc` pada `kv_namespaces[0].id`
   (menggantikan placeholder).
4. Deploy:
   ```bash
   pnpm run deploy      # = vite build && wrangler deploy
   ```

> Untuk dev lokal, placeholder `id` sudah cukup — Miniflare tidak butuh id asli.

## Catatan

- Grid diurutkan berdasarkan popularitas (`POPULARITY_DESC`) dan menyembunyikan
  konten dewasa (`isAdult: false`).
- Hitung mundur episode dihitung dari `airingAt` (timestamp absolut), jadi tetap
  akurat walau data-nya diambil dari cache.
