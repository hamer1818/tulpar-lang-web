/**
 * One-shot: render public/og-image.png (1200x630), the sitewide OG/Twitter
 * card referenced from astro.config.mjs. Re-run whenever the brand colors
 * in src/styles/custom.css or the tagline change.
 *
 * Run: node scripts/generate-og-image.mjs
 */

import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import * as path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'og-image.png');

const WIDTH = 1200;
const HEIGHT = 630;

const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1115"/>
      <stop offset="100%" stop-color="#0b0c0f"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#00e5ff"/>
      <stop offset="100%" stop-color="#2979ff"/>
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>

  <!-- faint grid, matches the site's hero background -->
  <g stroke="#1c1f27" stroke-width="1">
    ${Array.from({ length: 30 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="${HEIGHT}"/>`).join('')}
    ${Array.from({ length: 16 }, (_, i) => `<line x1="0" y1="${i * 40}" x2="${WIDTH}" y2="${i * 40}"/>`).join('')}
  </g>

  <rect x="0" y="0" width="10" height="${HEIGHT}" fill="url(#accent)"/>

  <text x="90" y="230" font-family="'Segoe UI', system-ui, sans-serif" font-size="88" font-weight="700"><tspan fill="#ffffff">Tulpar</tspan><tspan fill="url(#accent)">Lang</tspan></text>

  <text x="92" y="300" font-family="'Segoe UI', system-ui, sans-serif" font-size="34" fill="#c0c2c7">As easy as Python, as fast as C.</text>

  <text x="92" y="360" font-family="'Segoe UI', system-ui, sans-serif" font-size="26" fill="#888b96">Statically-typed · AOT-compiled · LLVM · batteries included</text>

  <g font-family="'Segoe UI', system-ui, sans-serif" font-size="24" fill="#00e5ff">
    <text x="92" y="560">tulparlang.dev</text>
  </g>
</svg>
`;

await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log(`wrote ${OUT}`);
