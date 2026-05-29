// Capture the README screenshots (ADR-0010). Read-only panels use REAL Mirror data;
// wallet-gated views use the dev-only demo mode (stub signer, canned outcomes, real reads).
//
// Prereqs (run from frontend/):
//   1. A built core artifact:        npm run build  (at repo root) — or rely on predev
//   2. frontend/.env with real VITE_TOKEN_ID / VITE_TOPIC_ID and
//        VITE_DEMO_ACCOUNT_ID=0.0.<a real testnet account>
//      (this script FORCES demo mode via Vite `define`, so VITE_DEMO need not be set.)
//   3. Chromium for Playwright:      npx playwright install chromium
//   Then:                            npm run screenshots
//
// Honesty (ADR-0010): the blocked-transfer status is the real network code; captions in the
// README state which shots use demo mode. Never present fabricated balances as real.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const outDir = fileURLToPath(new URL('../../docs/images/', import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));

const server = await createServer({
  root,
  mode: 'development',
  server: { open: false },
  // Force demo mode for the capture run so it can never silently render the
  // wallet-required state (ADR-0010). Real VITE_TOKEN_ID/TOPIC_ID still come from .env.
  define: { 'import.meta.env.VITE_DEMO': JSON.stringify('1') },
});
await server.listen();
const url = server.resolvedUrls?.local?.[0];
if (!url) throw new Error('vite dev server did not report a local URL');
console.log('dev server:', url);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
});

const panel = (heading) =>
  page.locator('section.panel', { has: page.getByRole('heading', { name: heading, exact: true }) });
const save = async (name, locator) => {
  await locator.screenshot({ path: `${outDir}${name}.png` });
  console.log(`captured ${name}.png`);
};

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  // Wait for live Mirror data to populate the token panel.
  await panel('Token').getByText('Total supply').waitFor({ timeout: 30_000 });

  await save('connected-header', page.locator('header.app-head'));
  await save('token-info', panel('Token'));
  await save('compliance-status', panel('Your compliance status'));
  await save('associate', panel('Associate'));
  await save('audit-trail', panel('Audit trail (HCS)'));

  // Transfer: fill the form, capture it, then trigger the demo-mode blocked outcome.
  const transfer = panel('Transfer');
  await transfer.getByPlaceholder('0.0.x').fill('0.0.5005');
  await transfer.getByPlaceholder('100').fill('100');
  await save('transfer-form', transfer);

  await transfer.getByRole('button', { name: 'Transfer' }).click();
  await transfer.getByText(/Network rejected the transfer/i).waitFor({ timeout: 15_000 });
  await save('transfer-blocked', transfer);
} finally {
  await browser.close();
  await server.close();
}
console.log('done — review docs/images/*.png and confirm no secrets appear in any shot.');
