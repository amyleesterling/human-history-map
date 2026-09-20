#!/usr/bin/env node
// Turns Qwen's Asia batches (kept verbatim under
// data/research/regions/asia-qwen/batch-*-civilizations.json) into
// data/civilizations-asia.json, the file the site loads. Later batches
// override earlier ones by id. Run scripts/import-historical-basemaps.mjs
// first when the import's merge table changed, then this, then
// scripts/fetch-summaries.mjs and scripts/validate.mjs.
//
// What it does to each entry, all recorded in NOTES.md there:
// - Renames Qwen's ids onto the site's where the same polity already has an
//   id (ID_MAP): Qwen's "maurya" is the site's "maurya-empire".
// - Skips entries that are phases of a polity the site already treats as
//   one (SKIP): Western and Eastern Han are the Han Dynasty.
// - For polities with a hand-checked entry in data/curated.json (one that
//   says more than a Wikipedia pin or a list of figures), takes only Qwen's
//   aliases (the native scripts) and fills capital and region if missing;
//   the checked summary, dates and fall stay.
// - Resolves fall targets: an id the index knows stays a link; anything
//   else becomes a plain name. Predecessor and successor lists keep only
//   known ids.
// - Marks every entry dateBasis: historical, so the chip prints the dates.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'data', 'research', 'regions', 'asia-qwen');
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

const ID_MAP = {
  maurya: 'maurya-empire', gupta: 'gupta-empire', mughal: 'mughal-empire',
  kushan: 'kushan-empire', parthian: 'parthian-empire', sasanian: 'sasanian-empire',
  safavid: 'safavid-empire', chola: 'chola-empire', xiongnu: 'xiongnu-bc200',
  'western-han': 'han-dynasty', 'eastern-han': 'han-dynasty',
  'unified-silla': 'silla', 'liao-dynasty': 'liao', 'uyghur-khaganate': 'uyghurs',
  'british-india': 'british-raj', seleucid: 'seleucid-kingdom', pandya: 'pandya-state-1279',
  'western-xia': 'xixia',
};
// the Southern Song is the second half of song-dynasty, as the two Han are one
const SKIP = new Set(['western-han', 'eastern-han', 'southern-song']);
// hand-set fields for particular entries, with the reason in NOTES.md
const PATCH = {
  // the imported border is the Qin state from 323 BCE; the entry covers the
  // state and the empire it became
  qin: (c) => ({ ...c, from: -770, summary: 'A western frontier state of the Zhou from 770 BCE that in 221 BCE became China\'s first unified empire under Qin Shi Huang. ' + c.summary.replace(/^China's first unified empire under Qin Shi Huang\. /, '') }),
  // the Korean Empire of 1897 to 1910 was Joseon under a new title, and the
  // imported 1900 map draws it; ending the entry in 1897 left Korea blank
  // until the 1914 map, so the entry runs to the annexation
  joseon: (c) => ({ ...c, to: 1910, successors: ['imperial-japan'], fell: { year: 1910, to: ['imperial-japan'], text: 'Joseon was proclaimed the Korean Empire in 1897 under the same royal house. Japan made it a protectorate in 1905 and annexed it in 1910.' } }),
  // the importer now folds the 900 map's Khitans into liao, whose
  // researched dates begin in 907, so the fall link lands on a drawn border
  balhae: (c) => ({ ...c, fell: { ...c.fell, to: ['liao'] } }),
  // no entry covers China between 1912 and the 1945 map, so the Republic
  // stays a plain name; the resolver would title-case it otherwise
  'qing-dynasty': (c) => ({ ...c, fell: { ...c.fell, to: ['Republic of China'] }, successors: [] }),
};

const manifest = read(join(root, 'data', 'manifest.json'));
const known = new Map();
for (const rel of manifest.civilizations) {
  if (rel === 'civilizations-asia.json') continue;
  for (const c of read(join(root, 'data', rel))) known.set(c.id, Object.assign(known.get(c.id) || {}, c));
}
// a curated entry that only pins a Wikipedia title or names figures to
// search for is not a hand-checked record: Qwen's dates and text still land
const curated = new Set(read(join(root, 'data', 'curated.json'))
  .filter((c) => Object.keys(c).some((k) => !['id', 'wikipedia', 'figures'].includes(k))).map((c) => c.id));

const batches = readdirSync(dir).filter((f) => /^batch-\d+-civilizations\.json$/.test(f)).sort();
const merged = new Map();
for (const f of batches) for (const c of read(join(dir, f))) {
  if (SKIP.has(c.id)) continue;
  const id = ID_MAP[c.id] || c.id;
  merged.set(id, { ...c, id });
}
const title = (slug) => slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const resolve = (ref) => {
  const id = ID_MAP[ref] || ref;
  if (known.has(id) || merged.has(id)) return { id };
  const own = merged.get(ref);
  return { name: own ? own.name : title(ref) };
};

const out = [];
for (const c of merged.values()) {
  let e = { ...c, dateBasis: 'historical' };
  if (PATCH[e.id]) e = PATCH[e.id](e);
  if (e.fell && Array.isArray(e.fell.to)) e.fell.to = e.fell.to.map((t) => { const r = resolve(t); return r.id || r.name; });
  for (const k of ['predecessors', 'successors']) if (Array.isArray(e[k])) e[k] = e[k].map((t) => resolve(t).id).filter(Boolean);
  if (curated.has(e.id)) {
    const prev = known.get(e.id) || {};
    e = {
      id: e.id,
      aliases: [...new Set([...(prev.aliases || []), ...(c.aliases || [])])].filter((a) => a !== prev.name),
      ...(prev.capital ? {} : { capital: c.capital }),
      ...(prev.region ? {} : { region: c.region }),
      dateBasis: 'historical',
    };
  }
  out.push(e);
}
out.sort((a, b) => (a.from ?? 0) - (b.from ?? 0) || a.id.localeCompare(b.id));
writeFileSync(join(root, 'data', 'civilizations-asia.json'), JSON.stringify(out, null, 2) + '\n');
const overrides = out.filter((e) => known.has(e.id)).length;
console.log(`${out.length} entries from ${batches.length} batch file(s): ${overrides} override imported or curated polities, ${out.length - overrides} are new`);
