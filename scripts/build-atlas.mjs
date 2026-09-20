// The atlas pages are the explorer and the card page in the atlas skin:
// ink on paper in the manner of an engraved world map. They are the same
// markup as index.html and civ.html with the root marked data-skin="atlas",
// the holographic library left out and atlas.css loaded after site.css, so
// they are generated from the two, never edited by hand:
//
//   node scripts/build-atlas.mjs          # writes atlas.html, atlas-civ.html
//   node scripts/build-atlas.mjs --check  # exits 1 when either is stale
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

export function atlasOf(html, page) {
  let out = html;
  out = swap(out, '<html lang="en">', '<html lang="en" data-skin="atlas">', page);
  out = swap(out, '<!DOCTYPE html>\n', `<!DOCTYPE html>\n<!-- generated from ${page} by scripts/build-atlas.mjs; edit ${page}, then run it -->\n`, page);
  out = swap(out, '<meta name="theme-color" content="#0b1220">', '<meta name="theme-color" content="#e9e3d3">', page);
  out = swap(out, '<link rel="stylesheet" href="vendor/scifi-ui/hologram.css">\n', '', page);
  out = swap(out, '<link rel="stylesheet" href="vendor/scifi-ui/panel-surface.css">\n', '', page);
  out = out.replace(/(<link rel="stylesheet" href="site\.css(\?v=[^"]*)?">)/, (m, link, v) => `${link}\n<link rel="stylesheet" href="atlas.css${v || ''}">`);
  if (!out.includes('href="atlas.css')) throw new Error(`${page}: no site.css link to follow`);
  if (out.includes('hologram-tap.js')) out = swap(out, '<script src="vendor/scifi-ui/hologram-tap.js"></script>\n', '', page);
  // the brand and the static globe links point at the atlas explorer; the
  // scripts rewrite the rest with the skin in hand
  out = swap(out, 'class="brand holounder" href="./"', 'class="brand" href="atlas.html"', page);
  out = out.split('id="globeLink" class="chip" href="./"').join('id="globeLink" class="chip" href="atlas.html"');
  out = out.split('<a class="minimap" id="minimapLink" href="./"').join('<a class="minimap" id="minimapLink" href="atlas.html"');
  out = out.split('<a class="btn" id="heroOpen" href="./"').join('<a class="btn" id="heroOpen" href="atlas.html"');
  out = out.split('<p class="crumbs"><a href="./">Globe</a>').join('<p class="crumbs"><a href="atlas.html">Globe</a>');
  // Cinzel's regular text is what the atlas page reads, so it is preloaded too
  out = swap(out, '<link rel="preload" href="vendor/fonts/cinzel/cinzel-600-latin.woff2" as="font" type="font/woff2" crossorigin>\n',
    '<link rel="preload" href="vendor/fonts/cinzel/cinzel-600-latin.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="vendor/fonts/eb-garamond/eb-garamond-400-latin.woff2" as="font" type="font/woff2" crossorigin>\n', page);
  return out;
}

const pages = [['index.html', 'atlas.html'], ['civ.html', 'atlas-civ.html']];
let stale = 0;
for (const [src, dst] of pages) {
  const want = atlasOf(readFileSync(join(root, src), 'utf8'), src);
  const have = existsSync(join(root, dst)) ? readFileSync(join(root, dst), 'utf8') : null;
  if (CHECK) {
    if (have !== want) { console.error(`${dst} is stale: run node scripts/build-atlas.mjs`); stale++; }
  } else if (have !== want) {
    writeFileSync(join(root, dst), want);
    console.log(`wrote ${dst} from ${src}`);
  } else {
    console.log(`${dst} is current`);
  }
}
if (stale) process.exit(1);
