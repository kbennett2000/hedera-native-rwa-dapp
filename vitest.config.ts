import { defineConfig } from 'vitest/config';

// The default `npm test` runs only test/unit (fast, no network) — the unit dir
// is passed on the CLI. `npm run test:integration` points the same runner at
// test/integration (testnet, on demand, never in CI). See docs/adr/0002 & 0005.
export default defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: true,
  },
});
