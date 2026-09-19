#!/usr/bin/env node
// Checks the data folder against DATA-FORMAT.md so a bad file is caught here
// and not by a visitor's phone. Run it before every commit that touches data:
//
//   node scripts/validate.mjs            # errors exit 1, warnings do not
//   node scripts/validate.mjs --strict   # warnings fail too
//
// Errors: things the explorer cannot cope with (unknown polity ids, unclosed
// rings, from >= to, duplicate ids, unparseable JSON). Warnings: things that
// will show but look wrong (a border outside its polity's lifetime, a
// "fell to" that names nobody we know, a dash in the copy, a huge file).

import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature as topoFeature } from 'topojson-client';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');
const errors = [], warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function readJSON(rel) {
  try {
    return JSON.parse(readFileSync(join(root, rel), 'utf8'));
  } catch (e) {
    err(`${rel}: ${e.message}`);
    return null;
  }
}

// Amy's standing rule: no em or en dashes in copy, ever
const DASH = /[–—]/;
function checkCopy(where, text) {
  if (typeof text === 'string' && DASH.test(text)) warn(`${where}: contains an em or en dash; use a comma, colon, semicolon or full stop`);
}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const isInt = (n) => Number.isInteger(n);

const manifest = readJSON('data/manifest.json');
if (!manifest) { report(); process.exit(1); }

const tl = manifest.timeline || {};
if (!isInt(tl.start) || !isInt(tl.end) || tl.start >= tl.end) err('manifest.timeline needs integer start < end');
if (Array.isArray(tl.anchors)) {
  let py = -Infinity, pt = -Infinity;
  for (const a of tl.anchors) {
    if (!Array.isArray(a) || a.length !== 2) { err(`manifest anchors: bad entry ${JSON.stringify(a)}`); continue; }
    if (a[0] <= py || a[1] <= pt) err(`manifest anchors must increase in both year and position: ${JSON.stringify(a)}`);
    py = a[0]; pt = a[1];
  }
}
for (const e of manifest.eras || []) {
  if (!e.name || !isInt(e.from) || !isInt(e.to) || e.from >= e.to) err(`manifest eras: bad entry ${JSON.stringify(e)}`);
  checkCopy('manifest eras', e.name);
}
checkCopy('manifest.notice', manifest.notice);

// ---- polities ---------------------------------------------------------
const civFiles = Array.isArray(manifest.civilizations) ? manifest.civilizations : [manifest.civilizations];
const civs = new Map();
for (const rel of civFiles) {
  const list = readJSON('data/' + rel);
  if (!Array.isArray(list)) { err(`${rel}: must be a JSON array`); continue; }
  list.forEach((c, i) => {
    const where = `${rel}[${i}]`;
    if (!c || typeof c !== 'object') return err(`${where}: not an object`);
    if (!c.id || !ID.test(c.id)) err(`${where}: id "${c.id}" must be lower-case words joined by hyphens`);
    // the same id in a later file is an override, not a duplicate
    if (civs.has(c.id) && civs.get(c.id)._file === rel) err(`${where}: duplicate id ${c.id}`);
    if (civs.has(c.id)) c = { ...civs.get(c.id), ...Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined)) };
    if (!c.name) err(`${where} (${c.id}): missing name`);
    if (!isInt(c.from)) err(`${where} (${c.id}): from must be an integer year`);
    if (c.to != null && !isInt(c.to)) err(`${where} (${c.id}): to must be an integer year or null`);
    if (isInt(c.from) && isInt(c.to) && c.from >= c.to) err(`${where} (${c.id}): from ${c.from} is not before to ${c.to}`);
    if (c.from === 0 || c.to === 0) warn(`${where} (${c.id}): there is no year 0; use -1 for 1 BCE or 1 for 1 CE`);
    if (c.color && !/^#[0-9a-fA-F]{6}$/.test(c.color)) err(`${where} (${c.id}): color must be #rrggbb`);
    if (c.summary && c.summary.length > 600) warn(`${where} (${c.id}): summary is ${c.summary.length} characters; the tooltip wants one paragraph`);
    if (c.kind != null && !['state', 'culture'].includes(c.kind)) err(`${where} (${c.id}): kind must be "state" or "culture"`);
    for (const k of ['name', 'summary', 'capital', 'region']) checkCopy(`${where} (${c.id}).${k}`, c[k]);
    (c.aliases || []).forEach((a) => checkCopy(`${where} (${c.id}).aliases`, a));
    if (c.fell) {
      if (c.fell.year != null && !isInt(c.fell.year)) err(`${where} (${c.id}).fell.year must be an integer`);
      if (c.fell.to != null && !Array.isArray(c.fell.to)) err(`${where} (${c.id}).fell.to must be an array`);
      checkCopy(`${where} (${c.id}).fell.text`, c.fell.text);
    }
    civs.set(c.id, { ...c, _file: rel });
  });
}

// cross references
for (const c of civs.values()) {
  for (const key of ['predecessors', 'successors']) {
    for (const id of c[key] || []) if (!civs.has(id)) warn(`${c.id}.${key}: "${id}" is not a known polity id`);
  }
  if (c.fell && Array.isArray(c.fell.to)) {
    for (const t of c.fell.to) {
      if (typeof t === 'string' && ID.test(t) && !civs.has(t) && !t.includes(' ')) warn(`${c.id}.fell.to: "${t}" looks like an id but is not a known polity (plain names are fine)`);
    }
  }
}

// ---- borders ----------------------------------------------------------
const drawn = new Map(); // civ id -> [from, to] ranges seen
function checkRing(where, ring, quantized = false) {
  if (!Array.isArray(ring) || ring.length < 4) return err(`${where}: ring needs at least 4 positions`);
  const [a, b] = [ring[0], ring[ring.length - 1]];
  if (a[0] !== b[0] || a[1] !== b[1]) err(`${where}: ring is not closed (first and last position differ)`);
  for (const p of ring) {
    if (!Array.isArray(p) || p.length < 2 || typeof p[0] !== 'number' || typeof p[1] !== 'number') return err(`${where}: bad position ${JSON.stringify(p)}`);
    if (p[0] < -180 || p[0] > 180 || p[1] < -90 || p[1] > 90) return err(`${where}: position out of range ${JSON.stringify(p)} (longitude, latitude)`);
    // decoded TopoJSON arcs are floats by construction; only hand-written
    // GeoJSON is asked to round
    if (!quantized && (String(p[0]).split('.')[1]?.length > 4 || String(p[1]).split('.')[1]?.length > 4)) { warn(`${where}: coordinates carry more than 4 decimals; round them to shrink the file`); break; }
  }
}
for (const b of manifest.borders || []) {
  if (!b.file || !isInt(b.from) || !isInt(b.to) || b.from >= b.to) { err(`manifest borders: bad entry ${JSON.stringify(b)}`); continue; }
  const rel = 'data/' + b.file;
  if (!existsSync(join(root, rel))) { err(`${rel}: listed in the manifest but missing`); continue; }
  const size = statSync(join(root, rel)).size;
  if (size > 1.5e6) warn(`${rel}: ${(size / 1e6).toFixed(1)} MB; split it by era or simplify the geometry`);
  let fc = readJSON(rel);
  const quantized = !!(fc && fc.type === 'Topology');
  if (fc && fc.type === 'Topology') {
    const key = Object.keys(fc.objects || {})[0];
    if (!key) { err(`${rel}: TopoJSON with no objects`); continue; }
    fc = topoFeature(fc, fc.objects[key]);
  }
  if (!fc || fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) { err(`${rel}: must be a GeoJSON FeatureCollection or a TopoJSON Topology`); continue; }
  // imported snapshot files carry snapshot dates that need not match a
  // polity's curated lifetime; only hand-drawn files get the lifetime check
  const imported = b.file.startsWith('hb/');
  fc.features.forEach((f, i) => {
    const where = `${b.file}#${i}`;
    const p = f.properties || {};
    const civ = civs.get(p.civ);
    if (!civ) return err(`${where}: civ "${p.civ}" is not in the polity index`);
    const from = p.from ?? civ.from, to = p.to ?? civ.to ?? Infinity;
    if (!isInt(from) || (to !== Infinity && !isInt(to))) err(`${where} (${p.civ}): from/to must be integer years`);
    else if (from >= to) err(`${where} (${p.civ}): from ${from} is not before to ${to}`);
    else {
      if (!imported && (from < civ.from || (civ.to != null && to > civ.to))) warn(`${where} (${p.civ}): border ${from}..${to} lies outside the polity's lifetime ${civ.from}..${civ.to ?? 'present'}`);
      if (from < b.from || to > b.to) warn(`${where} (${p.civ}): border ${from}..${to} is outside this file's manifest range ${b.from}..${b.to}, so it will not always load`);
      const seen = drawn.get(p.civ) || [];
      // several shapes with the same dates are one polity in pieces (an
      // empire and its colonies); only different, overlapping ranges are odd
      if (!imported) for (const [f0, t0] of seen) if (from < t0 && f0 < to && !(f0 === from && t0 === to)) { warn(`${where} (${p.civ}): overlaps another border of the same polity (${f0}..${t0}); both will draw`); break; }
      seen.push([from, to]);
      drawn.set(p.civ, seen);
    }
    if (p.precision != null && ![1, 2, 3].includes(p.precision)) err(`${where} (${p.civ}): precision must be 1, 2 or 3`);
    checkCopy(`${where}.label`, p.label); checkCopy(`${where}.note`, p.note);
    const g = f.geometry;
    if (!g) return err(`${where} (${p.civ}): no geometry`);
    if (g.type === 'Polygon') g.coordinates.forEach((r, k) => checkRing(`${where} ring ${k}`, r, quantized));
    else if (g.type === 'MultiPolygon') g.coordinates.forEach((poly, j) => poly.forEach((r, k) => checkRing(`${where} polygon ${j} ring ${k}`, r, quantized)));
    else err(`${where} (${p.civ}): geometry must be a Polygon or MultiPolygon, not ${g.type}`);
  });
}
for (const c of civs.values()) {
  if (!drawn.has(c.id) && !c.generated) warn(`${c.id}: no border drawn in any file`);
}

// ---- summaries --------------------------------------------------------
let summaryCount = 0;
const summaryFiles = Array.isArray(manifest.summaries) ? manifest.summaries : (manifest.summaries ? [manifest.summaries] : []);
for (const rel of summaryFiles) {
  if (!existsSync(join(root, 'data', rel))) { warn(`${rel}: listed in the manifest but not written yet (run scripts/fetch-summaries.mjs)`); continue; }
  const obj = readJSON('data/' + rel);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { err(`${rel}: must be an object of id -> { summary, source }`); continue; }
  for (const [id, e] of Object.entries(obj)) {
    if (!civs.has(id)) { warn(`${rel}: summary for unknown polity ${id}`); continue; }
    if (!e || !e.summary) { err(`${rel}: ${id} has no summary text`); continue; }
    summaryCount++;
    checkCopy(`${rel} ${id}`, e.summary);
    if (e.source && !e.source.url) warn(`${rel}: ${id} names a source without a url`);
  }
}
const withSummary = [...civs.values()].filter((c) => c.summary).length + summaryCount;

// ---- cards ------------------------------------------------------------
const pattern = manifest.cards || 'cards/{id}.json';
let cardCount = 0;
const cardIds = [];
for (const c of civs.values()) {
  const rel = 'data/' + (c.card || pattern.replace('{id}', c.id));
  if (!existsSync(join(root, rel))) continue;
  cardCount++;
  if (!c.card) cardIds.push(c.id);
  const card = readJSON(rel);
  if (!card) continue;
  if (card.id && card.id !== c.id) err(`${rel}: id "${card.id}" does not match the file's polity ${c.id}`);
  checkCopy(`${rel}.overview`, card.overview);
  for (const s of card.sections || []) {
    checkCopy(`${rel} section title`, s.title);
    if (!Array.isArray(s.items)) { err(`${rel}: section "${s.title}" needs an items array`); continue; }
    s.items.forEach((it, i) => {
      if (!it.text) err(`${rel}: section "${s.title}" item ${i} has no text`);
      if (it.year != null && !isInt(it.year)) err(`${rel}: section "${s.title}" item ${i} year must be an integer`);
      if (it.link && it.link.civ && !civs.has(it.link.civ)) warn(`${rel}: section "${s.title}" item ${i} links to unknown polity "${it.link.civ}"`);
      checkCopy(`${rel} "${s.title}" item ${i}`, it.text);
    });
  }
  if (card.fall) {
    checkCopy(`${rel}.fall.text`, card.fall.text);
    for (const t of card.fall.to || []) if (typeof t === 'string' && ID.test(t) && !civs.has(t) && !t.includes(' ')) warn(`${rel}.fall.to: "${t}" looks like an id but is not a known polity`);
  }
}

// cards/index.json tells the pages which polities have a card, so a phone
// never requests one that is not there; it is regenerated on every clean run
if (!errors.length) {
  const idxPath = join(root, 'data', pattern.replace(/[^/]*$/, ''), 'index.json');
  const next = JSON.stringify(cardIds.sort(), null, 1) + '\n';
  const prev = existsSync(idxPath) ? readFileSync(idxPath, 'utf8') : null;
  if (prev !== next) { writeFileSync(idxPath, next); console.log(`wrote ${cardIds.length} ids to ${idxPath.slice(root.length + 1)}`); }
}

function report() {
  for (const w of warnings) console.log('warning:', w);
  for (const e of errors) console.log('ERROR:', e);
  console.log(`\n${civs.size} polities, ${drawn.size} with borders, ${withSummary} with summaries, ${cardCount} cards; ${errors.length} errors, ${warnings.length} warnings`);
}
report();
process.exit(errors.length || (strict && warnings.length) ? 1 : 0);
