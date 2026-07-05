/**
 * Standalone Vitest config. Deliberately independent of vite.config.ts so unit
 * tests never load the Cloudflare / TanStack Start plugins (they assume a full
 * app build and break under the test runner).
 */
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '#': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
