/**
 * Read the search index from Cloudflare KV and write it as a static JSON file
 * at `public/search-index.json`. The search page then fetches this file
 * directly; no KV access needed at runtime.
 *
 *   node --experimental-strip-types scripts/build-search-index.ts
 *
 * Env: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN
 */
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const NAMESPACE_ID =
  process.env.CLOUDFLARE_KV_NAMESPACE_ID ?? '57122047ffca4a4c9697df42427760bf'
const KEY = 'anilist:search:v1:index'

async function main() {
  if (!ACCOUNT_ID || !API_TOKEN) {
    console.error(
      'Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN in env.',
    )
    process.exit(1)
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}/values/${encodeURIComponent(KEY)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  })

  if (!res.ok) {
    console.error(`KV GET ${res.status}: ${await res.text().catch(() => '')}`)
    process.exit(1)
  }

  const index = await res.json()
  const json = JSON.stringify(index)
  const out = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'public',
    'search-index.json',
  )
  writeFileSync(out, json, 'utf-8')

  const count = Array.isArray(index) ? index.length : 0
  console.log(
    `Search index ditulis ke public/search-index.json: ${count} entri`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
