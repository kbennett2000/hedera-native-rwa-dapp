// Capture the README screenshots (ADR-0010, amended). Mirror Node requests are
// intercepted in Playwright and served from hand-authored fixtures (scripts/fixtures/),
// so capture needs no testnet account, no .env, and no live deployment; wallet-gated
// views use the dev-only demo mode (stub signer, canned outcomes).
//
// Prereqs (run from frontend/):
//   1. A built core artifact:        npm run build  (at repo root) — or rely on prescreenshots
//   2. Chromium for Playwright:      npx playwright install chromium
//   Then:                            npm run screenshots
//
// Honesty (ADR-0010): the blocked-transfer status is the real network code; captions in the
// README state that the shots use demo mode with simulated Mirror data. Never present
// fabricated balances as real.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const outDir = fileURLToPath(new URL('../../docs/images/', import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));

// Ids must match the fixtures; force them (plain assignment) so a stray local .env
// cannot desync the app config from the intercepted responses.
const TOKEN_ID = '0.0.5821234';
const TOPIC_ID = '0.0.5821235';
const DEMO_ACCOUNT_ID = '0.0.9876543';
const MIRROR_URL = 'https://testnet.mirrornode.hedera.com';
process.env.VITE_TOKEN_ID = TOKEN_ID;
process.env.VITE_TOPIC_ID = TOPIC_ID;
process.env.VITE_DEMO_ACCOUNT_ID = DEMO_ACCOUNT_ID;
process.env.VITE_MIRROR_NODE_URL = MIRROR_URL;

const fixture = (name) =>
  readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8');

const tokenInfoBody = fixture('token-info.json');
// The account relationship is swapped mid-run so each shot shows the state its
// README step describes: no relationship (associate button visible), then
// associated-but-not-KYC'd (compliance badges + the blocked transfer).
const accountTokensEmptyBody = fixture('account-tokens-empty.json');
const accountTokensAssociatedBody = fixture('account-tokens-associated.json');
let accountTokensBody = accountTokensEmptyBody;
// topic-messages.json stores audit payloads as readable JSON; build the real wire
// body by base64-encoding each payload into the `message` field.
const topicFixture = JSON.parse(fixture('topic-messages.json'));
const topicMessagesBody = JSON.stringify({
  ...topicFixture,
  messages: topicFixture.messages.map(({ payload, ...wire }) => ({
    ...wire,
    message: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'),
  })),
});

const server = await createServer({
  root,
  mode: 'development',
  server: { open: false },
  // Force demo mode for the capture run so it can never silently render the
  // wallet-required state (ADR-0010). The ids above reach the app via process.env.
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

// Serve simulated Mirror responses; anything unexpected gets a loud 404 so a new
// app request can't silently hit the live testnet during capture.
const routes = new Map([
  [`/api/v1/tokens/${TOKEN_ID}`, () => tokenInfoBody],
  [`/api/v1/accounts/${DEMO_ACCOUNT_ID}/tokens`, () => accountTokensBody],
  [`/api/v1/topics/${TOPIC_ID}/messages`, () => topicMessagesBody],
]);
await page.route(`${MIRROR_URL}/**`, (route) => {
  const { pathname } = new URL(route.request().url());
  const body = routes.get(pathname);
  if (!body) {
    console.warn(`no fixture for ${pathname} — fulfilling 404`);
    return route.fulfill({ status: 404, body: '' });
  }
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: body(),
  });
});

const panel = (heading) =>
  page.locator('section.panel', { has: page.getByRole('heading', { name: heading, exact: true }) });
const save = async (name, locator) => {
  await locator.screenshot({ path: `${outDir}${name}.png` });
  console.log(`captured ${name}.png`);
};

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  // Wait for the (simulated) Mirror data to populate the token panel.
  await panel('Token').getByText('Total supply').waitFor({ timeout: 30_000 });

  // Phase 1 — no token relationship yet: the Associate card shows its button.
  await save('connected-header', page.locator('header.app-head'));
  await save('token-info', panel('Token'));
  await save('associate', panel('Associate'));
  await save('audit-trail', panel('Audit trail (HCS)'));

  // Phase 2 — associated but not yet KYC'd (the README step-6 state: the badges
  // read Associated / KYC not granted / Cannot receive, and step 7's transfer is
  // consistently blocked). Swap the served relationship and refetch.
  accountTokensBody = accountTokensAssociatedBody;
  const compliance = panel('Your compliance status');
  await compliance.getByRole('button', { name: 'Refresh' }).click();
  await compliance.getByText('KYC not granted').waitFor({ timeout: 15_000 });
  await save('compliance-status', compliance);

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
