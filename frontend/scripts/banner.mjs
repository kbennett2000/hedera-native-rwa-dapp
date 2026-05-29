// Rasterize the hero banner SVG → PNG (ADR-0010). PNG renders identically on GitHub;
// the SVG stays the editable source. Run: npm run banner
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const svgPath = fileURLToPath(new URL('../../docs/images/banner.svg', import.meta.url));
const outPath = fileURLToPath(new URL('../../docs/images/banner.png', import.meta.url));

const svg = readFileSync(svgPath, 'utf8');
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 2400 }, // 2× of the 1200px viewBox for crisp rendering
  font: { loadSystemFonts: true },
});
const png = resvg.render().asPng();
writeFileSync(outPath, png);
console.log(`wrote ${outPath} (${png.length} bytes)`);
