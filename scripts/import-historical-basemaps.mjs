#!/usr/bin/env node
// Converts the year-by-year world files of the historical-basemaps project
// (github.com/aourednik/historical-basemaps, CC BY-NC-SA 4.0) into this
// site's format, so the explorer can be filled end to end in one go while
// the researched borders are still being drawn.
//
//   node scripts/import-historical-basemaps.mjs --fetch            # download every snapshot, write to data/hb/
//   node scripts/import-historical-basemaps.mjs /path/to/geojson   # convert a local checkout's geojson folder
//   ... --out data/hb --prefix hb                                   # where to write, and the id prefix
//
// It writes one border file per snapshot (borders/hb-<year>.geojson, valid
// from that snapshot's year until the next one), a polity index
// (civilizations-hb.json) with one entry per distinct NAME, and prints the
// manifest lines to paste in. Nothing is added to the manifest by itself.
//
// Licence: the source is CC BY-NC-SA 4.0. Ship the attribution and the
// licence with anything you import from it, and do not use it commercially.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const FETCH = args.includes('--fetch');
const OUT = opt('--out', 'data/hb');
const PREFIX = opt('--prefix', 'hb');
const SRC = args.find((a) => !a.startsWith('--') && a !== OUT && a !== PREFIX);
const RAW = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/';
// the modern layer built by scripts/build-base.mjs takes over from here
const MODERN_FROM = 2020;

const yearOf = (file) => {
  const m = /world_(bc)?(\d+)/.exec(basename(file));
  return m ? (m[1] ? -Number(m[2]) : Number(m[2])) : null;
};
const slug = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const round = (c) => (typeof c[0] === 'number' ? [Math.round(c[0] * 1000) / 1000, Math.round(c[1] * 1000) / 1000] : c.map(round));

async function loadSnapshots() {
  if (FETCH) {
    const index = await (await fetch(RAW + 'index.json')).json();
    const out = [];
    for (const entry of index) {
      const year = entry.year ?? yearOf(entry.filename);
      process.stderr.write(`fetching ${entry.filename}\n`);
      const fc = await (await fetch(RAW + 'geojson/' + entry.filename)).json();
      out.push({ year, file: entry.filename, fc });
    }
    return out;
  }
  if (!SRC) { console.error('give a geojson folder, or --fetch'); process.exit(1); }
  return readdirSync(SRC).filter((f) => /^world_.*\.geojson$/.test(f)).map((f) => ({
    year: yearOf(f), file: f, fc: JSON.parse(readFileSync(join(SRC, f), 'utf8')),
  })).filter((s) => s.year != null);
}

const snaps = (await loadSnapshots()).sort((a, b) => a.year - b.year);
mkdirSync(join(OUT, 'borders'), { recursive: true });

const polities = new Map();
const manifestLines = [];
for (let i = 0; i < snaps.length; i++) {
  const s = snaps[i];
  const to = i + 1 < snaps.length ? snaps[i + 1].year : MODERN_FROM;
  const features = [];
  for (const f of s.fc.features) {
    const p = f.properties || {};
    const name = p.NAME && String(p.NAME).trim();
    if (!name || !f.geometry) continue;   // unnamed shapes are "no state here"
    const id = `${PREFIX}-${slug(name)}`;
    let c = polities.get(id);
    if (!c) {
      c = { id, name, aliases: [], from: s.year, to, region: null, summary: null, generated: 'historical-basemaps', schematic: p.BORDERPRECISION === 1 };
      polities.set(id, c);
    }
    c.from = Math.min(c.from, s.year);
    c.to = Math.max(c.to, to);
    if (p.ABBREVN && !c.aliases.includes(p.ABBREVN) && p.ABBREVN !== name) c.aliases.push(p.ABBREVN);
    const props = { civ: id, from: s.year, to, precision: [1, 2, 3].includes(p.BORDERPRECISION) ? p.BORDERPRECISION : 1 };
    if (p.SUBJECTO && p.SUBJECTO !== name) props.note = `subject to ${p.SUBJECTO}`;
    if (p.PARTOF) props.note = (props.note ? props.note + '; ' : '') + `part of ${p.PARTOF}`;
    features.push({ type: 'Feature', properties: props, geometry: { ...f.geometry, coordinates: round(f.geometry.coordinates) } });
  }
  const tag = s.year < 0 ? `bc${-s.year}` : String(s.year);
  const rel = `borders/${PREFIX}-${tag}.geojson`;
  writeFileSync(join(OUT, rel), JSON.stringify({ type: 'FeatureCollection', features }));
  manifestLines.push(`    { "file": "${rel}", "from": ${s.year}, "to": ${to} }`);
  process.stderr.write(`${rel}: ${features.length} features, ${s.year} to ${to}\n`);
}
for (const c of polities.values()) if (c.to >= MODERN_FROM) c.to = MODERN_FROM;
const list = [...polities.values()].sort((a, b) => a.from - b.from || a.name.localeCompare(b.name));
writeFileSync(join(OUT, `civilizations-${PREFIX}.json`), JSON.stringify(list, null, 1));
writeFileSync(join(OUT, 'SOURCE.txt'), `Converted from https://github.com/aourednik/historical-basemaps by
scripts/import-historical-basemaps.mjs on ${new Date().toISOString().slice(0, 10)}.
Licence: CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/).
Attribution: "Historical boundaries of world countries and cultural regions"
by Andre Ourednik and contributors.
`);
console.log(`\n${list.length} polities, ${snaps.length} snapshots written to ${OUT}/\n`);
console.log('Add to data/manifest.json:\n');
console.log(`  "civilizations": ["civilizations.json", "${PREFIX}/civilizations-${PREFIX}.json", "civilizations-modern.json"],`);
console.log('  "borders": [');
console.log(manifestLines.map((l) => l.replace('"borders/', `"${PREFIX}/borders/`)).join(',\n'));
console.log('  ]');
