// Generate labeled placeholder PNGs for each README screenshot slot (ADR-0010), so the
// README renders with no broken images until `npm run screenshots` captures the real ones.
// Run: npm run placeholders
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const outDir = fileURLToPath(new URL('../../docs/images/', import.meta.url));

const SHOTS = [
  { name: 'connected-header', label: 'Connected header', w: 1280, h: 150 },
  { name: 'token-info', label: 'Token info panel', w: 1000, h: 600 },
  { name: 'compliance-status', label: 'Compliance status panel', w: 1000, h: 520 },
  { name: 'associate', label: 'Associate card', w: 1000, h: 360 },
  { name: 'transfer-form', label: 'Transfer form', w: 1000, h: 560 },
  { name: 'transfer-blocked', label: 'Blocked transfer (the payoff shot)', w: 1000, h: 560 },
  { name: 'audit-trail', label: 'Audit trail (HCS) feed', w: 1000, h: 600 },
];

const placeholderSvg = (
  label,
  w,
  h,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#1a212b"/>
  <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="none" stroke="#2b3543" stroke-width="2" stroke-dasharray="8 6"/>
  <text x="${w / 2}" y="${h / 2 - 8}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="700" fill="#e6edf3">${label}</text>
  <text x="${w / 2}" y="${h / 2 + 26}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="15" fill="#9aa7b4">placeholder — run \`npm run screenshots\` to capture the real shot</text>
</svg>`;

for (const { name, label, w, h } of SHOTS) {
  const png = new Resvg(placeholderSvg(label, w, h), {
    fitTo: { mode: 'width', value: w * 2 },
    font: { loadSystemFonts: true },
  })
    .render()
    .asPng();
  writeFileSync(`${outDir}${name}.png`, png);
  console.log(`wrote ${name}.png`);
}
