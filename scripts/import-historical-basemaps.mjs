#!/usr/bin/env node
// Converts the year-by-year world files of the historical-basemaps project
// (github.com/aourednik/historical-basemaps, GPL-3.0) into this site's
// format: one TopoJSON border file per snapshot, and a polity index in which
// each name's run of consecutive snapshots is one polity.
//
//   node scripts/import-historical-basemaps.mjs --fetch          # download the snapshots, then convert
//   node scripts/import-historical-basemaps.mjs --src ./geojson  # convert a local checkout's geojson folder
//
// Run scripts/build-base.mjs first: the present-day countries it writes are
// joined onto the polities alive in the last snapshot, so "France" is one
// polity from 1279 to today rather than two that meet at 2020. Then run
// scripts/fetch-summaries.mjs and scripts/validate.mjs.
//
// What the conversion decides, and why:
// - A name that appears in consecutive snapshots is one polity; a gap of
//   more than one snapshot starts a new one (Egypt of 4000 BCE is not the
//   Egypt of 1922). A single missing snapshot is treated as continuous.
// - A few names are merged where the source spells one polity two ways
//   ("Han" and "Han Empire", the four "Rome (…)" tetrarchs); see MERGES.
// - A colony or dependency (SUBJECTO names another polity on the same map)
//   is drawn in its ruler's colour and keeps its own name as the label, so
//   the 1914 map shows the empires and still says "Angola" on Angola.
// - Hunter-gatherer regions, farming cultures and the like are kept, marked
//   kind: "culture", and drawn fainter than states.
// - Geometry is simplified on the sphere and quantized as shared arcs, which
//   is what makes fifty world maps fit in about ten megabytes with no gaps
//   between neighbours.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { topology } from 'topojson-server';
import { presimplify, simplify, sphericalTriangleArea } from 'topojson-simplify';
import { quantize, feature as topoFeature } from 'topojson-client';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const FETCH = args.includes('--fetch');
const SRC = opt('--src', null);
const OUT = join(root, 'data', 'hb');
const RAW = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/';

const FIRST_SNAPSHOT = -4000;   // the timeline starts at 3500 BCE; earlier maps are prehistory
const MODERN_FROM = 2020;       // where scripts/build-base.mjs's present-day borders take over
const SIMPLIFY_WEIGHT = 2e-8;   // steradians: triangles under about 0.8 km² go
const QUANTIZATION = 1e5;       // about 400 m on the ground

// [variants, canonical name, id (optional), {from, to} snapshot-year bounds (optional)]
const MERGES = [
  [/^Rome \(.*\)$/, 'Roman Empire'],
  [['Han', 'Han Empire'], 'Han Dynasty', 'han-dynasty'],
  [['Ming Empire', 'Ming Chinese Empire'], 'Ming Dynasty', 'ming-dynasty'],
  [['Eastern Roman Empire', 'Byzantine Empire'], 'Byzantine Empire'],
  [['Mauryan Empire'], 'Maurya Empire'],
  [['Axum'], 'Kingdom of Aksum', 'aksum'],
  [['Ottoman Sultanate'], 'Ottoman Empire'],
  [['Republic of Turkey'], 'Turkey'],
  [['United States of America'], 'United States'],
  [['Kingdom of France'], 'France'],
  [['Kingdom of Italy'], 'Italy'],
  [['Kingdom of Brazil'], 'Brazil'],
  [['Empire of Japan'], 'Japan'],
  [['Kingdom of Norway'], 'Norway'],
  [['Kingdom of Hungary'], 'Hungary'],
  [['Kingdom of Georgia'], 'Georgia'],
  [['Kingdom of Sardinia'], 'Sardinia'],
  [['Kingdom of Ireland'], 'Ireland'],
  [['Kingdom of Pagan'], 'Pagan'],
  [['Sultanate of Zanzibar'], 'Zanzibar'],
  [['Wadai Empire'], 'Wadai'],
  [['Kong Empire'], 'Kong'],
  [['Chimú Empire'], 'Chimú'],
  [['Jin Empire'], 'Jin'],
  [['Rashtrakuta state'], 'Rashtrakuta'],
  [['Pallava state'], 'Pallava'],
  [['Chinese warlords'], 'Chinese Warlords'],
  [['Principality of Novgorod'], 'Novgorod'],
  // the source draws the Seljuks of Rum in Anatolia under the same name as
  // the Great Seljuks of Iran; from 1279 they are their own polity
  [['Seljuk Empire', 'Seljuk Turks', 'Seljuk Caliphate'], 'Sultanate of Rum', 'sultanate-of-rum', { from: 1279 }],
  [['Seljuk Caliphate'], 'Seljuk Empire'],
  [['Ghana'], 'Empire of Ghana', null, { to: 1300 }],
  [['Indus valley civilization'], 'Indus Valley Civilization', 'indus-valley'],
  [['city-states'], 'Sumer', 'sumer', { to: -1500 }],
  [['Maya chiefdoms and states', 'Maya states', 'Maya city-states'], 'Maya', 'maya'],
  [['Songhai'], 'Songhai Empire'],
  [['Mali'], 'Mali Empire', null, { to: 1800 }],
  // Asia, harmonized with the ids Qwen's research uses (see
  // data/research/regions/asia-qwen/NOTES.md), so its entries override
  // these polities instead of standing beside them
  [['Zhoa'], 'Zhou', 'zhou', { to: -1200 }],
  [['Zhoa'], 'Western Zhou', 'western-zhou', { from: -1046, to: -771 }],
  [['Zhoa'], 'Eastern Zhou', 'eastern-zhou', { from: -770, to: -256 }],
  [['Jin'], 'Jin', 'jin-dynasty', { to: 700 }],
  [['Toba Wei'], 'Northern Wei', 'northern-wei'],
  // the 700 map still says Sui, the 900 map still says Yamato: by then they
  // were the Tang and the Heian court, whose own maps begin in 800 and 1000
  [['Sui', 'Sui Empire'], 'Tang', 'tang', { from: 700, to: 700 }],
  [['Yamato'], 'Heian', 'heian-japan', { from: 900, to: 900 }],
  [['Silia'], 'Silla', 'silla'],
  [['Tufan Empire'], 'Tibetan Empire', 'tibetan-empire'],
  [['Göktürks'], 'Göktürk Khaganate', 'gokturk'],
  [['Sui Empire'], 'Sui', 'sui'],
  [['Tang Empire'], 'Tang', 'tang'],
  [['Song Empire'], 'Song', 'song-dynasty'],
  [['Koguryo'], 'Goguryeo', 'goguryeo'],
  // the source's word for the Semitic-speaking peoples of Arabia before any
  // state was there; "Semites" reads today as a racial label, and the
  // Wikipedia article of that name is about the term, not the people
  [['Semites'], 'Semitic-speaking peoples', 'semites'],
  [['Vedic Aryans'], 'Vedic Indo-Aryans', 'vedic-aryans'],
  [['Proto-Slavs'], 'Early Slavs', 'proto-slavs'],
  // the Khitan realm of the 900 map is the Liao of 1000 and 1100; the 1200
  // map's "Liao" sits in Manchuria and north China, which was Jurchen Jin
  [['Khitans'], 'Liao', 'liao', { to: 1100 }],
  // its own name, since runs are grouped by name and "Jin" is already the
  // Jin of 266; Qwen's entry renames it "Jin Dynasty"
  [['Liao'], 'Jurchen Jin', 'jin-dynasty-1115', { from: 1200 }],
  [['Great Khanate', 'Great Khanat'], 'Yuan Dynasty', 'yuan-dynasty'],
  [['Manchu Empire', 'Qing Empire'], 'Qing Dynasty', 'qing-dynasty'],
  [['Maratha Confederacy', 'Maratha Con.'], 'Maratha', 'maratha'],
  [['Paekche'], 'Baekje', 'baekje'],
  [['Parhae', 'Balhae'], 'Balhae', 'balhae'],
  [['Korea'], 'Goryeo', 'goryeo', { to: 1200 }],
  [['Korea'], 'Joseon', 'joseon', { from: 1492, to: 1900 }],
  [['Japan'], 'Heian', 'heian-japan', { from: 800, to: 900 }],
  [['Imperial Japan (Fujiwara)'], 'Heian', 'heian-japan', { to: 1100 }],
  [['Imperial Japan (Fujiwara)'], 'Kamakura', 'kamakura', { from: 1200 }],
  [['Shogun Japan (Kamakura)'], 'Kamakura', 'kamakura', { to: 1300 }],
  [['Shogun Japan (Kamakura)'], 'Muromachi', 'muromachi', { from: 1400 }],
  [['Sultanate of Delhi'], 'Delhi Sultanate', 'delhi-sultanate'],
  [['Srivijaya Empire'], 'Srivijaya', 'srivijaya'],
  [['Cholas', 'Chola Empire'], 'Chola Empire', 'chola-empire'],
  // the 300 map still calls Persia Parthian and the 400 map calls it Persia,
  // seventy and a hundred and seventy years after Ardashir took it in 224;
  // both are the Sasanian Empire, whose first map under its own name is 500
  [['Parthian Empire'], 'Sasanian Empire', 'sasanian-empire', { from: 300, to: 400 }],
  [['Persia'], 'Sasanian Empire', 'sasanian-empire', { from: 400, to: 400 }],
  [['Parthia', 'Parthian Empire'], 'Parthian Empire', 'parthian-empire'],
];

const CULTURE_TYPES = new Set(['hunter-gatherers', 'farmers', 'pastoral nomads', 'rice farmers', 'pastoralists',
  'taiga hunter-gatherers', 'transhumant pastoralists', 'cultures', 'culture', 'N. European Bronze Age cultures']);
const CULTURE_NAME = /hunter|gatherer|farmers|foraging|fishers|fichers|nomads|pastoral|shellfish|chiefdoms|societies|tribes$|peoples$|cultures?$|neolithic|bronze age|hunters$/i;
// the early maps label whole regions by language family or archaeological
// culture where no state existed (Bantu, Khoisan, Austronesians, Jōmon,
// Afanasevo). The source gives them no type, so by canonical name: drawn as
// a faint wash under the states, labelled only when there is room, and the
// chip says "a people or culture, not a state"
const CULTURE_NAMES = new Set(['Aboriginal Tasmanians', 'Ainu', 'Ainus', 'Austronesians', 'Bantu', 'Cycladic',
  'Dravidians', 'Jōmon', 'Khoisan', 'Namazga', 'Norte Chico', 'Semitic-speaking peoples', 'Valdivia', 'Afanasevo',
  'Andronovo', 'Beaker', 'Koreans', 'Oxus', 'Sintashta', 'Thai', 'Tibeto-Burmanese', 'Únětice', 'Arameans',
  'Berbers', 'Burmese', 'Celtiberians', 'Chinchoros', 'Chorrera', 'Cimerians', 'El Paraiso', 'Guanches',
  'Illyrians', 'Paleo-Koreans', 'Phrygians', 'Saami', 'Sinic', 'Vedic Indo-Aryans', 'Paleo-Inuit', 'Early Slavs',
  'Celts', 'Scythians', 'Tungus', 'Dacians', 'Papuans', 'Polynesians', 'Siberians', 'Bedouins', 'Tuaregs', 'Cushites']);

const slug = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const yearOf = (file) => { const m = /world_(bc)?(\d+)/.exec(basename(file)); return m ? (m[1] ? -Number(m[2]) : Number(m[2])) : null; };
const tagOf = (year) => (year < 0 ? `bc${-year}` : String(year));

// two spellings that differ only in diacritics or punctuation ("Maori" and
// "Māori") are one name: the first spelling met is kept, the rest are aliases
// [name on the map, snapshot year, segments]: one polygon that successive
// polities held between that map and the next. The 400 map's Jin is the
// Eastern Jin, whose lands the Liu Song took in 420; the 500 map still says
// Jin over a south that was the Southern Qi, then Liang, then Chen. Each
// segment runs to its `to`, the last to the next map. A segment's polity is
// created if the index does not have it, with the segment's years as its
// coverage; curated or researched dates then narrow the drawing.
const SPLITS = [
  // The remaining Commonwealth ended with the third partition in 1795.
  // See data/research/regions/europe/commonwealth-depth/evidence.json.
  ['Poland', 1783, [{ id: 'poland-1783', to: 1795 }]],
  ['Jin', 400, [{ id: 'jin-dynasty', to: 420 }, { id: 'liu-song', name: 'Liu Song' }]],
  ['Jin', 500, [{ id: 'southern-qi', name: 'Southern Qi', to: 502 }, { id: 'liang-dynasty', name: 'Liang', to: 557 }, { id: 'chen-dynasty', name: 'Chen' }]],
  ['Yamato', 700, [{ id: 'yamato', to: 710 }, { id: 'nara-japan', name: 'Nara' }]],
  ['Kamakura', 1300, [{ id: 'kamakura', to: 1333 }, { id: 'muromachi', name: 'Muromachi' }]],
  ['Jurchen Jin', 1200, [{ id: 'jin-dynasty-1115', to: 1234 }, { id: 'mongol-empire' }]],
];
// [name, map year, from, until]: a polygon carried into the other maps of
// [from, until) that lack it while the polity lived. The 1279 and 1300 maps
// fold Korea into the Yuan; Goryeo, a Yuan client, kept its own court until
// 1392. The 1400 map still draws China and Mongolia as one Great Khanate;
// that shape is dropped (DROPS) and the 1492 Ming shape stands in from 1368.
const CARRIES = [
  ['Goryeo', 1200, 1200, 1392],
  ['Ming Dynasty', 1492, 1368, 1492],
];
// [name, map year]: shapes left out altogether
const DROPS = [
  ['Great Khanate', 1400],
];
const splitFor = (name, year) => SPLITS.find(([n, y]) => n === name && y === year);

// whether a ring of the quantized topology has no area: fewer than three
// distinct positions, or a planar area of nothing (collinear points)
function ringIsFlat(t, arcs) {
  const ring = topoFeature(t, { type: 'Polygon', arcs: [arcs] }).geometry.coordinates[0];
  if (new Set(ring.map((c) => c.join(','))).size < 3) return true;
  let a = 0;
  for (let i = 0, n = ring.length - 1; i < n; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return Math.abs(a) < 1e-9;
}

const spellings = new Map();
function canonical(name, year) {
  // house style: a compound name takes a plain hyphen, never an en dash
  let n = name.trim().replace(/\s*[\u2013\u2014]\s*/g, '-');
  for (const [variants, canon, id, bounds] of MERGES) {
    const hit = variants instanceof RegExp ? variants.test(n) : variants.includes(n);
    if (!hit) continue;
    if (bounds && ((bounds.from != null && year < bounds.from) || (bounds.to != null && year > bounds.to))) continue;
    // a dated rename corrects a mislabel in one map ("Parthian Empire" at
    // 300 is the Sasanian Empire); the mislabel is not another name for it
    return { name: canon, id: id || null, dated: !!bounds };
  }
  const key = slug(n);
  if (!spellings.has(key)) spellings.set(key, n);
  return { name: spellings.get(key), id: null };
}

async function loadSnapshots() {
  if (FETCH) {
    const index = await (await fetch(RAW + 'index.json')).json();
    const out = [];
    for (const e of index.years) {
      if (e.year < FIRST_SNAPSHOT) continue;
      process.stderr.write(`fetching ${e.filename}\n`);
      out.push({ year: e.year, fc: await (await fetch(RAW + 'geojson/' + e.filename)).json() });
    }
    out.licence = await (await fetch(RAW + 'LICENSE')).text();
    return out;
  }
  if (!SRC) { console.error('give --src <geojson folder>, or --fetch'); process.exit(1); }
  const out = readdirSync(SRC).filter((f) => /^world_.*\.geojson$/.test(f))
    .map((f) => ({ year: yearOf(f), fc: JSON.parse(readFileSync(join(SRC, f), 'utf8')) }))
    .filter((s) => s.year != null && s.year >= FIRST_SNAPSHOT);
  const lic = join(SRC, '..', 'LICENSE');
  out.licence = existsSync(lic) ? readFileSync(lic, 'utf8') : null;
  return out;
}

const snaps = (await loadSnapshots()).sort((a, b) => a.year - b.year);
const nextYear = (i) => (i + 1 < snaps.length ? snaps[i + 1].year : MODERN_FROM);

// ---- pass 1: who owns each shape in each snapshot -------------------------
// owner = the polity the shape is drawn as; label = the name written on it
const perSnap = snaps.map((s) => {
  const names = new Set(s.fc.features.filter((f) => f.properties && f.properties.NAME && slug(f.properties.NAME)).map((f) => canonical(f.properties.NAME, s.year).name));
  const shapes = [];
  for (const f of s.fc.features) {
    const p = f.properties || {};
    // a name with no letter or digit in it is not a name
    if (!p.NAME || !slug(p.NAME) || !f.geometry) continue;
    const self = canonical(p.NAME, s.year);
    let owner = self, label = null;
    if (p.SUBJECTO && p.SUBJECTO.trim() !== p.NAME.trim()) {
      const ruler = canonical(p.SUBJECTO, s.year);
      if (ruler.name !== self.name && names.has(ruler.name)) { owner = ruler; label = p.NAME.trim(); }
    }
    const kind = CULTURE_TYPES.has(p.TYPE) || CULTURE_NAME.test(self.name) || CULTURE_NAMES.has(self.name) ? 'culture' : 'state';
    const abbrev = p.ABBREVN ? String(p.ABBREVN).trim().replace(/\s*[\u2013\u2014]\s*/g, '-') : null;
    shapes.push({ owner, self, label, kind, precision: [1, 2, 3].includes(p.BORDERPRECISION) ? p.BORDERPRECISION : 1, abbrev, geometry: f.geometry });
  }
  return shapes;
});

// ---- pass 2: runs of consecutive snapshots become polities ---------------
const presence = new Map(); // canonical name -> { id, indices:Set, kinds, aliases }
perSnap.forEach((shapes, i) => {
  for (const sh of shapes) {
    for (const who of [sh.owner]) {
      let e = presence.get(who.name);
      if (!e) { e = { name: who.name, id: who.id, indices: new Set(), kinds: new Map(), aliases: new Set() }; presence.set(who.name, e); }
      e.indices.add(i);
      e.kinds.set(sh.kind, (e.kinds.get(sh.kind) || 0) + 1);
      // a subject's own name is its label, never an alias of its ruler
      if (sh.abbrev && sh.abbrev !== who.name && !sh.label && !sh.self.dated && !/\(/.test(sh.abbrev)) e.aliases.add(sh.abbrev);
    }
  }
});
// original spellings become aliases so search still finds "Han Empire"
for (const s of snaps) for (const f of s.fc.features) {
  const p = f.properties || {};
  if (!p.NAME || !p.NAME.trim()) continue;
  if (!slug(p.NAME)) continue;
  const c = canonical(p.NAME, s.year);
  const e = presence.get(c.name);
  // "Rome (Galerius)" is a tetrarch's share, not another name for Rome
  const spelled = p.NAME.trim().replace(/\s*[\u2013\u2014]\s*/g, '-');
  if (e && !c.dated && c.name !== spelled && !/\(/.test(spelled)) e.aliases.add(spelled);
}

const polities = [];
const runOf = new Map(); // `${name}@${snapIndex}` -> polity
for (const e of presence.values()) {
  const idx = [...e.indices].sort((a, b) => a - b);
  const runs = [];
  for (const i of idx) {
    const cur = runs[runs.length - 1];
    if (cur && i - cur[cur.length - 1] <= 2) cur.push(i); else runs.push([i]);
  }
  const base = e.id || slug(e.name);
  const kind = [...e.kinds.entries()].sort((a, b) => b[1] - a[1])[0][0];
  runs.forEach((run, k) => {
    const from = snaps[run[0]].year, to = nextYear(run[run.length - 1]);
    const id = k === 0 ? base : `${base}-${tagOf(from)}`;
    const pol = {
      id, name: e.name, aliases: [...e.aliases].filter((a) => a !== e.name), from, to,
      kind: kind === 'culture' ? 'culture' : undefined, circa: true,
      summary: null, generated: 'historical-basemaps',
    };
    polities.push(pol);
    for (const i of run) runOf.set(`${e.name}@${i}`, pol);
    // a single missing snapshot inside the run still maps to this polity
    for (let i = run[0]; i <= run[run.length - 1]; i++) if (!runOf.has(`${e.name}@${i}`)) runOf.set(`${e.name}@${i}`, pol);
  });
}

// polities that share a map's polygon with a predecessor (see SPLITS)
for (const [name, year, segs] of SPLITS) {
  const i = snaps.findIndex((s) => s.year === year);
  if (i < 0 || !perSnap[i].some((sh) => sh.owner.name === name)) { console.warn(`split: no ${name} on the ${year} map`); continue; }
  let start = year;
  for (const seg of segs) {
    const end = seg.to ?? nextYear(i);
    let pol = polities.find((p) => p.id === seg.id);
    if (!pol) {
      pol = { id: seg.id, name: seg.name, aliases: [], from: start, to: end, kind: undefined, circa: true, summary: null, generated: 'historical-basemaps' };
      polities.push(pol);
    } else if (seg.name) { pol.from = Math.min(pol.from, start); pol.to = Math.max(pol.to, end); }
    start = end;
  }
}

// ---- pass 3: the curated entries win on everything they say ---------------
const curatedPath = join(root, 'data', 'curated.json');
const curated = existsSync(curatedPath) ? JSON.parse(readFileSync(curatedPath, 'utf8')) : [];
const byId = new Map(polities.map((p) => [p.id, p]));
for (const c of curated) {
  const p = byId.get(c.id);
  if (!p) { console.warn(`curated: no imported polity with id ${c.id}`); continue; }
  for (const [k, v] of Object.entries(c)) {
    if (k === 'id' || v == null) continue;
    if (k === 'aliases') p.aliases = [...new Set([...(p.aliases || []), ...v])].filter((a) => a !== (c.name || p.name));
    else p[k] = v;
  }
  if (c.from != null || c.to != null) p.circa = false;
  // a curated entry that only pins a Wikipedia title or names the figures
  // to search for leaves the record a generated one; the marker tells the
  // coverage report what is researched
  if (Object.keys(c).some((k) => !['id', 'wikipedia', 'figures'].includes(k))) delete p.generated;
}

// ---- pass 4: present-day countries join the polities alive in 2010 ---------
// where the 2010 map spells a country differently from Natural Earth
const MODERN_ALIASES = {
  belarus: 'Byelarus', myanmar: 'Burma', 'democratic-republic-of-the-congo': 'Zaire',
  'north-korea': "Korea, Democratic People's Republic of", 'south-korea': 'Korea, Republic of',
  'north-macedonia': 'Macedonia', eswatini: 'Swaziland', gambia: 'Gambia, The',
  'trinidad-and-tobago': 'Trinidad', 'united-republic-of-tanzania': 'Tanzania, United Republic of',
};
const modernCivPath = join(root, 'data', 'civilizations-modern.json');
const modernGeoPath = join(root, 'data', 'borders', 'modern.geojson');
if (existsSync(modernCivPath) && existsSync(modernGeoPath)) {
  const modern = JSON.parse(readFileSync(modernCivPath, 'utf8'));
  const geo = JSON.parse(readFileSync(modernGeoPath, 'utf8'));
  const last = snaps.length - 1;
  const alive = new Map();
  for (const p of polities) {
    if (p.to !== MODERN_FROM && p.to !== null) continue;
    alive.set(p.id, p);
    for (const a of [p.name, ...p.aliases]) if (!alive.has(slug(a))) alive.set(slug(a), p);
  }
  const keep = [];
  let joined = 0;
  for (const c of modern) {
    const cands = [c.id, slug(c.name), ...(c.aliases || []).map(slug), ...(MODERN_ALIASES[c.id] ? [slug(MODERN_ALIASES[c.id])] : [])];
    const p = cands.map((k) => alive.get(k)).find(Boolean);
    if (!p) { keep.push(c); continue; }
    joined++;
    p.to = null;
    // a country that reaches the present goes by its present name
    const old = p.name;
    p.name = c.name;
    p.aliases = [...new Set([old, ...p.aliases, ...(c.aliases || [])])].filter((a) => a !== p.name);
    if (!p.region && c.region) p.region = c.region;
    for (const f of geo.features) if (f.properties.civ === c.id) f.properties.civ = p.id;
  }
  writeFileSync(modernCivPath, JSON.stringify(keep, null, 1));
  writeFileSync(modernGeoPath, JSON.stringify(geo));
  console.error(`${joined} present-day countries joined onto 2010 polities; ${keep.length} stay separate: ${keep.map((c) => c.name).join(', ')}`);
}

// ---- pass 5: write the border files -------------------------------------
mkdirSync(join(OUT, 'borders'), { recursive: true });
const manifestLines = [];
let totalBytes = 0;
perSnap.forEach((shapes, i) => {
  const from = snaps[i].year, to = nextYear(i);
  const carried = [];
  for (const [name, year, start, until] of CARRIES) {
    if (from === year || from < start || from >= until || shapes.some((sh) => sh.owner.name === name)) continue;
    const src = snaps.findIndex((s) => s.year === year);
    const shape = perSnap[src]?.find((sh) => sh.owner.name === name);
    if (!shape) { console.warn(`carry: no ${name} on the ${year} map`); continue; }
    carried.push({ ...shape, carriedFrom: src, carriedUntil: until });
  }
  const kept = shapes.filter((sh) => !DROPS.some(([name, year]) => name === sh.owner.name && year === from));
  const features = [...kept, ...carried].flatMap((sh) => {
    const pol = runOf.get(`${sh.owner.name}@${sh.carriedFrom ?? i}`);
    if (sh.carriedFrom != null) {
      pol.from = Math.min(pol.from, from);
      pol.to = Math.max(pol.to, Math.min(to, sh.carriedUntil));
      const props = { civ: pol.id, from, to: Math.min(to, sh.carriedUntil), precision: sh.precision };
      return [{ type: 'Feature', properties: props, geometry: sh.geometry }];
    }
    const split = splitFor(sh.owner.name, from);
    const segs = split ? split[2] : [{ id: pol.id }];
    let start = from;
    return segs.map((seg) => {
      const end = seg.to ?? to;
      const props = { civ: seg.id, from: start, to: end, precision: sh.precision };
      if (sh.label) props.label = sh.label;
      start = end;
      return { type: 'Feature', properties: props, geometry: sh.geometry };
    });
  });
  let t = topology({ borders: { type: 'FeatureCollection', features } });
  t = presimplify(t, sphericalTriangleArea);
  t = simplify(t, SIMPLIFY_WEIGHT);
  t = quantize(t, QUANTIZATION);
  // simplifying can collapse a tiny shape to a ring with no area (its points
  // all the same once quantized), and d3 fills such a ring as the whole
  // visible hemisphere: Amy saw the Old World painted one colour in the
  // 1630s by an Athabascan sliver. Those rings go, and a shape with nothing
  // left goes with them.
  let flat = 0;
  const cleanRings = (rings) => {
    if (ringIsFlat(t, rings[0])) { flat++; return null; }
    return rings.filter((r, k) => { if (k === 0 || !ringIsFlat(t, r)) return true; flat++; return false; });
  };
  for (const g of t.objects.borders.geometries) {
    if (g.type === 'Polygon') { const r = cleanRings(g.arcs); if (r) g.arcs = r; else g.type = null; }
    else if (g.type === 'MultiPolygon') {
      const kept = g.arcs.map(cleanRings).filter(Boolean);
      if (!kept.length) g.type = null;
      else if (kept.length === 1) { g.type = 'Polygon'; g.arcs = kept[0]; }
      else g.arcs = kept;
    }
  }
  t.objects.borders.geometries = t.objects.borders.geometries.filter((g) => g.type !== null);
  if (flat) process.stderr.write(`${tagOf(from)}: dropped ${flat} ring(s) with no area\n`);
  const rel = `borders/world-${tagOf(from)}.json`;
  const text = JSON.stringify(t);
  totalBytes += text.length;
  writeFileSync(join(OUT, rel), text);
  manifestLines.push(`    { "file": "hb/${rel}", "from": ${from}, "to": ${to} }`);
});

polities.sort((a, b) => a.from - b.from || a.name.localeCompare(b.name));
for (const p of polities) { if (p.summary == null) delete p.summary; if (!p.aliases.length) delete p.aliases; }
// three thousand entries load on every visit: compact, one per line
writeFileSync(join(OUT, 'civilizations-hb.json'), '[\n' + polities.map((p) => JSON.stringify(p)).join(',\n') + '\n]\n');
if (snaps.licence) writeFileSync(join(OUT, 'LICENSE'), snaps.licence);
writeFileSync(join(OUT, 'SOURCE.txt'), `Borders converted from the historical-basemaps project,
https://github.com/aourednik/historical-basemaps ("Historical boundaries of
world countries and cultural regions", Andre Ourednik and contributors),
by scripts/import-historical-basemaps.mjs on ${new Date().toISOString().slice(0, 10)}.
Licence: GPL-3.0, per that repository's LICENSE file (a copy is alongside).
The project describes itself as work in progress and asks that the maps be
checked against other sources before academic use.

borders/world-<year>.json   one TopoJSON per snapshot, valid until the next
civilizations-hb.json       one polity per run of consecutive snapshots,
                            hand-written fields merged in from
                            data/curated.json; dates are snapshot dates
                            (circa: true) unless curated

Nothing here is edited by hand: change data/curated.json or the importer
and run it again.
`);
console.error(`${polities.length} polities, ${snaps.length} snapshots, ${(totalBytes / 1e6).toFixed(1)} MB of borders -> data/hb/`);
console.log('manifest borders entries:\n' + manifestLines.join(',\n'));
