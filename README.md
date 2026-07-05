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

## Desain

Sistem visual didokumentasikan di **`PRODUCT.md`** (strategi: user, brand, prinsip)
dan **`DESIGN.md`** (token warna, tipografi, komponen, motion). Register: _product_.

Ciri khas: **aksen mengikuti musim** — hue UI berubah sesuai musim yang dibuka
(winter = biru es, spring = sakura, summer = aqua, fall = amber) lewat `[data-season]`
dan satu variabel hue. Semua pasangan teks/latar diverifikasi kontras WCAG AA, ada
dukungan `prefers-reduced-motion`, dan fokus keyboard di tiap kontrol. Token ada di
`src/styles.css`.

## Cara kerja data & caching

> **Penting:** AniList memblokir rentang IP Cloudflare Workers (balas `403 "manually
> blocked"`). Jadi **Worker tidak pernah fetch AniList langsung** — ia hanya baca/tulis
> Cloudflare KV. Data masuk ke KV dari IP yang tidak diblokir.

```
                    ┌── baca KV (hit) ──▶ render cepat (SSR)
Worker ─────────────┤
                    └── KV kosong (cold) ─▶ browser fetch AniList langsung
                                             (IP kamu, CORS *; bukan Worker)

Refresh: GitHub Actions cron (tiap 3 jam) ──▶ fetch AniList ──▶ tulis KV via REST API
```

- **Baca:** `getSeasonalAnime(season, year)` → key `anilist:season:v2:{season}:{year}`.
  Hanya membaca KV di produksi. Kalau kosong, browser yang fetch (lihat `src/lib/queries.ts`).
- **Tulis (otomatis):** GitHub Actions cron setiap 3 jam (`seed-recent.yml`) menjalankan
  `scripts/seed-recent.ts` — fetch musim sekarang + 4 musim ke depan dari AniList,
  lalu tulis langsung ke Cloudflare KV via REST API (TTL **30 hari**).
- **Tulis (bulk):** `scripts/seed-all.ts` untuk seed semua musim 1960–tahun depan
  (dijalankan sekali dari lokal).
- **Detail judul:** selalu di-fetch dari browser (`fetchAnimeDetail`), tidak lewat Worker.
- Di **dev lokal** tidak ada blokir IP, jadi cache miss boleh fetch AniList langsung
  supaya DX mulus.

Kode data layer: `src/server/anilist.ts` (KV read), `src/lib/anilist/client.ts`
(fetch AniList untuk browser/dev), `src/lib/anilist/*` (query, tipe, helper musim),
`src/lib/queries.ts` (React Query options).

## Cara mengisi & refresh data

**Sekali di awal — isi semua musim (1960 → tahun depan) ke KV** dari mesin ber-IP normal
(bukan Worker), lewat Cloudflare API:

```bash
node --experimental-strip-types scripts/seed-all.ts        # tulis KV
node --experimental-strip-types scripts/seed-all.ts --dry-run  # uji tanpa nulis
```

Pakai env `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` (sudah ada di User env; token butuh
izin **Workers KV Storage: Edit**). Musim kosong dilewati; musim lama tak pernah berubah jadi
cukup sekali. Setelah ini **setiap musim yang bisa dipilih user sudah ada di KV** — pengunjung
tidak pernah memicu fetch AniList.

**Otomatis — refresh musim berjalan & mendatang** via GitHub Actions cron:
`.github/workflows/seed-recent.yml` berjalan tiap **3 jam**, menjalankan
`scripts/seed-recent.ts`. Data musim sekarang + 4 musim ke depan diperbarui langsung
ke Cloudflare KV via REST API, tanpa perlu browser atau token rahasia.

## Rute

| Path                 | Isi                                     |
| -------------------- | --------------------------------------- |
| `/`                  | redirect ke musim & tahun berjalan      |
| `/$season/$year`     | grid anime + picker musim/tahun         |
| `/$season/$year/$id` | modal detail (bisa di-deep-link / SSR)  |
| `/seed`              | (dinonaktifkan — dulu untuk seed manual)|

`season` = `winter` \| `spring` \| `summer` \| `fall`.

## Menjalankan lokal

```bash
pnpm install
pnpm dev            # http://localhost:3000  (KV diemulasi oleh Miniflare)
```

Perintah lain: `pnpm build`, `pnpm preview`, `pnpm exec tsc --noEmit` (typecheck),
`pnpm generate-routes` (regen route tree).

## Kredensial Cloudflare (sudah ada di env)

Kredensial akun ini **sudah tersimpan permanen di environment variable User-scope**
(Windows), jadi Wrangler terautentikasi tanpa `wrangler login` interaktif. Referensikan
lewat **nama**-nya — jangan pernah menulis nilainya ke file mana pun:

| Env var | Kegunaan |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | ID akun; Wrangler & Cloudflare API memakainya otomatis |
| `CLOUDFLARE_API_TOKEN` | Token auth; menggantikan `wrangler login` |

Cek keberadaannya (tanpa membocorkan nilai):

```bash
# PowerShell — nama saja
[Environment]::GetEnvironmentVariables('User').Keys | Where-Object { $_ -match 'CLOUDFLARE' }
```

Akun: `Mzainalmuttaqin6@gmail.com`. KV namespace `CACHE` id: `57122047ffca4a4c9697df42427760bf`
(sudah terpasang di `wrangler.jsonc`).

## Deploy ke Cloudflare

Auth sudah lewat env di atas, jadi langsung:

```bash
pnpm run deploy                       # = vite build + wrangler deploy
```

Cache diisi otomatis oleh GitHub Actions cron setiap 3 jam — tidak perlu warm manual.

> Untuk dev lokal, `id` KV apa pun sudah cukup — Miniflare tidak butuh id asli.

## Catatan

- Grid diurutkan berdasarkan popularitas (`POPULARITY_DESC`) dan menyembunyikan
  konten dewasa (`isAdult: false`).
- Hitung mundur episode dihitung dari `airingAt` (timestamp absolut), jadi tetap
  akurat walau data-nya diambil dari cache.
