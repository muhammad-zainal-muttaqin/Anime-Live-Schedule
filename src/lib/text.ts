/**
 * Dependency-free text helpers shared by the app AND the Node seed scripts.
 *
 * This module intentionally has NO `#/…` subpath imports, so the seed scripts
 * (`node --experimental-strip-types scripts/*.ts`) can import it via a plain
 * relative path — no module resolver needed. Previously stripHtml / truncatePlain
 * / pickTitle were copy-pasted into each script; keep them here only.
 */

/** Structural title shape — avoids importing AniList types (keeps this file `#/`-free). */
export interface TitleLike {
  romaji?: string | null
  english?: string | null
  native?: string | null
}

/** Prefer English, fall back to romaji, then native. */
export function pickTitle(title: TitleLike): string {
  return title.english || title.romaji || title.native || 'Untitled'
}

/** Strip AniList's HTML/markup out of a description for plain-text preview. */
export function stripHtml(html: string | null): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .trim()
}

/**
 * Word-boundary truncation for synopsis previews stored in the season cache.
 * Only the list row shows this (grid doesn't), clamped to 2 lines (~140 chars),
 * so 180 is plenty — keeps the KV snapshot and SSR HTML lean. The detail modal
 * fetches the full, untruncated description separately.
 */
export function truncatePlain(text: string, max = 180): string {
  if (text.length <= max) return text
  const slice = text.slice(0, max)
  const lastSpace = slice.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`
}

/** Lowercase + strip diacritics so "Ō" matches "o". */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * Alternate titles to index for search: romaji/english/native + synonyms, minus
 * the display title, de-duped case/diacritic-insensitively and capped so the
 * search index stays small. Lets a visitor find a show by any of its names.
 */
export function altTitles(
  title: TitleLike,
  synonyms: readonly string[] | null | undefined,
  display: string,
  max = 8,
): string[] {
  const seen = new Set<string>([normalizeText(display)])
  const out: string[] = []
  const push = (raw: string | null | undefined) => {
    if (!raw || out.length >= max) return
    const value = raw.trim()
    const key = normalizeText(value)
    if (!key || seen.has(key)) return
    seen.add(key)
    out.push(value)
  }
  push(title.english)
  push(title.romaji)
  push(title.native)
  for (const s of synonyms ?? []) push(s)
  return out
}
