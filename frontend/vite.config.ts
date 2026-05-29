import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// `@core` and `@sdkMirror` resolve to the BUILT artifacts in ../dist (ADR-0009).
// Run the root build first — the predev/prebuild npm scripts handle this.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('../dist/core/index.js', import.meta.url)),
      '@sdkMirror': fileURLToPath(new URL('../dist/sdk/mirrorClient.js', import.meta.url)),
    },
  },
  // Some Hedera/WalletConnect deps expect a Node-style global; map it to globalThis.
  define: { global: 'globalThis' },
  optimizeDeps: { include: ['@hashgraph/hedera-wallet-connect', '@hashgraph/sdk'] },
  test: {
    // Pure view-logic only — no DOM/React/wallet. Node env (Buffer available for core parsers).
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
