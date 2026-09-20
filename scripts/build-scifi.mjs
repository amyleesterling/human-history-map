// The sci-fi pages are the explorer and the card page in the black
// holographic skin. They are the same markup as index.html and civ.html
// (the atlas, the default) with the root marked data-skin="scifi", the
// holographic library loaded, atlas.css left out and the skin toggle turned
// into a sun that leads back, so they are generated from the two, never
// edited by hand:
//
//   node scripts/build-scifi.mjs          # writes scifi.html, scifi-civ.html
//   node scripts/build-scifi.mjs --check  # exits 1 when either is stale
//
// scripts/validate.mjs runs the check, so a change to index.html or
// civ.html that is not rebuilt fails the data check.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const swap = (html, from, to, where) => {
  if (!html.includes(from)) throw new Error(`${where}: expected to find ${JSON.stringify(from)}`);
  return html.split(from).join(to);
};

const SUN = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

export function scifiOf(html, page) {
  const card = page === 'civ.html';
  let out = html;
  out = swap(out, '<html lang="en" data-skin="atlas">', '<html lang="en" data-skin="scifi">', page);
  out = swap(out, '<!DOCTYPE html>\n', `<!DOCTYPE html>\n<!-- generated from ${page} by scripts/build-scifi.mjs; edit ${page}, then run it -->\n`, page);
  out = swap(out, '<meta name="theme-color" content="#e9e3d3">', '<meta name="theme-color" content="#0b1220">', page);
  // the library's panels come in before the site's rules, the atlas paint stays out
  out = out.replace(/<link rel="stylesheet" href="site\.css(\?v=[^"]*)?">\n<link rel="stylesheet" href="atlas\.css(\?v=[^"]*)?">/, (m, v) =>
    `<link rel="stylesheet" href="vendor/scifi-ui/hologram.css">\n<link rel="stylesheet" href="vendor/scifi-ui/panel-surface.css">\n<link rel="stylesheet" href="site.css${v || ''}">`);
  if (out.includes('atlas.css')) throw new Error(`${page}: the atlas stylesheet link was not where expected`);
  // the tap layer the library requires wherever its hover treatments are used
  if (!card) out = swap(out, '<script src="vendor/scifi-ui/converge-swarm.js"></script>', '<script src="vendor/scifi-ui/hologram-tap.js"></script>\n<script src="vendor/scifi-ui/converge-swarm.js"></script>', page);
  // the brand takes the library's underline and, with the static globe
  // links, points at the sci-fi explorer; the scripts rewrite the rest with
  // the skin in hand
  out = swap(out, '<a class="brand" href="./">', '<a class="brand holounder" href="scifi.html">', page);
  out = out.split('id="globeLink" class="chip" href="./"').join('id="globeLink" class="chip" href="scifi.html"');
  out = out.split('<a class="minimap" id="minimapLink" href="./"').join('<a class="minimap" id="minimapLink" href="scifi.html"');
  out = out.split('<a class="btn" id="heroOpen" href="./"').join('<a class="btn" id="heroOpen" href="scifi.html"');
  out = out.split('<p class="crumbs"><a href="./">Globe</a>').join('<p class="crumbs"><a href="scifi.html">Globe</a>');
  // the moon becomes a sun that leads back to the atlas
  out = swap(out, card ? 'href="scifi-civ.html" title="The dark, sci-fi look" aria-label="Switch to the dark, sci-fi look"' : 'href="scifi.html" title="The dark, sci-fi look" aria-label="Switch to the dark, sci-fi look"',
    `href="${card ? 'civ.html' : './'}" title="The atlas look" aria-label="Switch to the atlas look"`, page);
  out = out.replace(/(<a id="skinBtn"[^>]*>\n\s*)<svg[\s\S]*?<\/svg>/, (m, open) => open + SUN);
  if (!out.includes('r="4.5"')) throw new Error(`${page}: the skin toggle was not where expected`);
  return out;
}

const pages = [['index.html', 'scifi.html'], ['civ.html', 'scifi-civ.html']];
let stale = 0;
for (const [src, dst] of pages) {
  const want = scifiOf(readFileSync(join(root, src), 'utf8'), src);
  const have = existsSync(join(root, dst)) ? readFileSync(join(root, dst), 'utf8') : null;
  if (CHECK) {
    if (have !== want) { console.error(`${dst} is stale: run node scripts/build-scifi.mjs`); stale++; }
  } else if (have !== want) {
    writeFileSync(join(root, dst), want);
    console.log(`wrote ${dst} from ${src}`);
  } else {
    console.log(`${dst} is current`);
  }
}
if (stale) process.exit(1);
