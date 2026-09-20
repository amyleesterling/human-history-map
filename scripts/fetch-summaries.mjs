#!/usr/bin/env node
// Fills in a summary for every polity that has none, from the first
// paragraph of its English Wikipedia article, with attribution. Wikipedia
// text is CC BY-SA 4.0; the summary files record the article and licence
// for each entry and the pages show the link. The hand-written summaries in
// data/civilizations.json always win over these.
//
//   node scripts/fetch-summaries.mjs                # fill data/*/summaries-*.json
//   node scripts/fetch-summaries.mjs --prefetch names.txt   # warm the cache only
//
// Every lookup is cached in .cache/wikipedia/ (gitignored), so re-running
// after a data change only fetches what is new.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(root, '.cache', 'wikipedia');
mkdirSync(CACHE, { recursive: true });
const UA = 'HumanHistoryMap/0.1 (https://github.com/amyleesterling/human-history-map)';
const CONCURRENCY = 4;

const args = process.argv.slice(2);
const prefetchFile = args.includes('--prefetch') ? args[args.indexOf('--prefetch') + 1] : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = (s) => createHash('sha1').update(s).digest('hex');

// null means "no such page"; anything else that goes wrong is thrown, so a
// network hiccup is never remembered as a missing article
async function getJSON(url) {
  let last = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) { last = new Error(`HTTP ${res.status}`); await sleep(1500 * (attempt + 1)); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      last = e;
      await sleep(1000 * (attempt + 1));
    }
  }
  throw last || new Error(`failed ${url}`);
}

// an outline, a list or a timeline is not a summary of anything
const NOT_AN_ARTICLE = /^(Outline|List|Lists|Index|Timeline|Category|Portal) of /i;

async function summaryOf(title) {
  const d = await getJSON(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}?redirect=true`);
  if (!d || !d.type) return null;
  if (NOT_AN_ARTICLE.test(d.title || '')) return null;
  return { type: d.type, title: d.title, extract: d.extract || '', url: d.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(d.title || title)}` };
}

async function search(q) {
  const d = await getJSON(`https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=5&srsearch=${encodeURIComponent(q)}`);
  return d?.query?.search?.map((s) => s.title) || [];
}

// "Korea, Democratic People's Republic of" -> "Democratic People's Republic of Korea";
// "Madagascar (France)" -> "Madagascar"
function lookupName(name) {
  let n = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const m = /^(.+?),\s+(.+ of)$/.exec(n);
  if (m) n = `${m[2]} ${m[1]}`;
  return n;
}

// a summary must be about the polity, not a namesake: a fallback search hit
// counts only when its title carries the name's most distinctive word
function stem(name) {
  const stop = new Set(['the', 'of', 'and', 'kingdom', 'empire', 'republic', 'state', 'states', 'dynasty', 'people', 'peoples', 'culture', 'cultures', 'tribes', 'city', 'hunter', 'gatherers', 'farmers']);
  const words = name.toLowerCase().replace(/[^a-zÀ-ɏ' -]/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !stop.has(w));
  return words.sort((a, b) => b.length - a.length)[0] || null;
}

// Amy's rule: no em or en dashes in copy. A dash between years becomes "to",
// a dash joining two words is a plain hyphen (Kanem-Bornu), and a spaced
// dash, the kind that sets off a clause, becomes a comma.
function cleanCopy(s) {
  return s
    .replace(/(\d)\s*[–—]\s*(?=(?:c\.\s*)?\d)/g, '$1 to ')
    .replace(/((?:BC|BCE|AD|CE))\s*[–—]\s*(?=(?:c\.\s*)?\d)/g, '$1 to ')
    .replace(/(\p{L})[–—](\p{L})/gu, '$1-$2')
    .replace(/\s*[–—]\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

// the first paragraph, cut at a sentence end once it is long enough
function trimExtract(s, max = 520) {
  const t = cleanCopy(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.'));
  return end > 120 ? t.slice(0, end + 1) : cut + '.';
}

const DESCRIPTIVE = /hunter|gatherer|farmers|foraging|fishers|fichers|nomads|pastoral|shellfish|chiefdoms|societies|tribes$|peoples$|cultures$/i;

let failures = 0;
// The direct result is cached by name. When the name is a disambiguation
// page the resolution depends on the polity's dates, so that result is
// cached by name and span; a "Jin" of 300 CE and a "Jin" of 1115 CE each
// get their own.
async function lookup(name, kind, span) {
  const file = join(CACHE, key(name) + '.json');
  const q = lookupName(name);
  let r;
  try {
    r = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : await finish(file, ...(await find(q, kind)));
  } catch (e) {
    failures++;
    console.error(`  lookup failed for "${name}": ${e.message}`);
    return { title: null };
  }
  if (r.title || !r.ambiguous) return r;
  const file2 = join(CACHE, key(`${name}@${span ? span.join('..') : ''}`) + '.json');
  if (existsSync(file2)) return JSON.parse(readFileSync(file2, 'utf8'));
  try {
    return await finish(file2, await resolveAmbiguous(q, span));
  } catch (e) {
    failures++;
    console.error(`  lookup failed for "${name}" (${span ? span.join("..") : ""}): ${e.message}`);
    return { title: null };
  }
}

async function finish(file, hit, extra = {}) {
  const out = hit ? { title: hit.title, url: hit.url, extract: hit.extract } : { title: null, ...extra };
  writeFileSync(file, JSON.stringify(out));
  await sleep(120);
  return out;
}

// "Jin dynasty (266–420)" carries its own dates; a polity of 300 to 600 CE
// is that Jin and not the Jurchen one of 1115 to 1234
const YEARS = /\((?:c\.\s*)?(\d{1,4})\s*(BC|BCE)?\s*[\u2013\u2014-]\s*(\d{1,4})\s*(BC|BCE|AD|CE)?\)/;
function titleSpan(t) {
  const m = YEARS.exec(t);
  if (!m) return null;
  let a = +m[1], b = +m[3];
  if (m[4] && /BC/.test(m[4])) { a = -a; b = -b; } else if (m[2]) a = -a;
  return [Math.min(a, b), Math.max(a, b)];
}
const overlaps = (s, span, slack = 60) => s[0] - slack <= span[1] && span[0] <= s[1] + slack;
const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// the name must be a whole word of the title: "Han" is not in "Ilkhanate"
const wordIn = (t, name) => new RegExp(`(^|[^\\p{L}])${escapeRe(name)}([^\\p{L}]|$)`, 'iu').test(t);
const KIND_WORD = /dynasty|empire|kingdom|state|caliphate|sultanate|khaganate|khanate|republic|civilization|culture|people|period|confederation|commonwealth/i;

// A name that is a disambiguation page (Jin, Zhou, Song): the articles
// whose titles carry the name, filtered by whole word, list pages dropped,
// a dated title only if its dates overlap the polity's, "X dynasty" forms
// first.
async function resolveAmbiguous(q, span) {
  const titles = [...new Set([...(await search(`intitle:"${q}"`)), ...(await search(`${q} dynasty OR empire OR kingdom OR state`))])];
  const ok = titles.filter((t) => !NOT_AN_ARTICLE.test(t) && wordIn(t, q))
    .filter((t) => { const s = titleSpan(t); return !s || !span || overlaps(s, span); })
    .sort((a, b) => (KIND_WORD.test(b) ? 1 : 0) - (KIND_WORD.test(a) ? 1 : 0) || a.length - b.length);
  for (const t of ok) {
    const s = await summaryOf(t);
    if (s && s.type === 'standard' && s.extract.length > 40) return s;
  }
  return null;
}

// returns [hit, extra]: the article, or null with a note of why, so that a
// disambiguation page can be resolved later with the polity's dates
async function find(q, kind) {
  if (DESCRIPTIVE.test(q) && !/culture$/i.test(q)) return [null, {}];
  const s = await summaryOf(q);
  if (s && s.type === 'standard' && s.extract.length > 40) return [s, {}];
  const ambiguous = !!s && s.type === 'disambiguation';
  if (kind === 'culture' || DESCRIPTIVE.test(q)) return [null, { ambiguous }];
  return [null, { ambiguous: ambiguous || !s }];
}

async function lookupExact(q) {
  const file = join(CACHE, key('q:' + q) + '.json');
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  try {
    const s = await summaryOf(q);
    return await finish(file, s && s.type === 'standard' && s.extract.length > 40 ? s : null);
  } catch (e) {
    failures++;
    console.error(`  lookup failed for "${q}": ${e.message}`);
    return { title: null };
  }
}

// "Egypt" in 3000 BCE must not get the modern republic's opening paragraph,
// and "Persia" in 400 CE must not get Iran's just because Wikipedia
// redirects the name there: a polity that ended before 1900 and lands on a
// present-day country's article is looked up as its ancient self or its
// history instead, or left without a summary
async function lookupFor(c, modernNames) {
  // a pinned title wins outright: the name alone found a namesake ("Wu"
  // the empress for Wu the state), or nothing on Wikipedia is about this
  // polity and an empty pin says so
  if (c.wikipedia != null) return c.wikipedia ? lookupExact(c.wikipedia) : { title: null };
  const plain = lookupName(c.name);
  const old = c.to != null && c.to <= 1900;
  const modernTitle = (t) => t && modernNames.has(lookupName(t).toLowerCase());
  const historical = async (name) => {
    for (const q of [`Ancient ${name}`, `History of ${name}`]) {
      const r = await lookupExact(q);
      if (r.title && !modernTitle(r.title)) return r;
    }
    return { title: null };
  };
  if (old && modernTitle(plain)) return historical(plain);
  const span = [c.from, c.to == null ? 2026 : c.to];
  let r = await lookup(c.name, c.kind, span);
  for (const a of c.aliases || []) { if (r.title) break; r = await lookup(a, c.kind, span); }
  if (old && r.title && modernTitle(r.title)) return historical(r.title);
  return r;
}

async function mapLimit(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

if (prefetchFile) {
  const names = readFileSync(prefetchFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  let done = 0, found = 0;
  await mapLimit(names, CONCURRENCY, async (n) => {
    const r = await lookup(n, DESCRIPTIVE.test(n) ? 'culture' : 'state');
    done++; if (r.title) found++;
    if (done % 100 === 0) console.log(`${done}/${names.length} looked up, ${found} found`);
  });
  console.log(`${done} names, ${found} with an article`);
} else {
  const manifest = JSON.parse(readFileSync(join(root, 'data/manifest.json'), 'utf8'));
  const civFiles = Array.isArray(manifest.civilizations) ? manifest.civilizations : [manifest.civilizations];
  const modernNames = new Set();
  for (const rel of civFiles) {
    for (const c of JSON.parse(readFileSync(join(root, 'data', rel), 'utf8'))) {
      // an override entry may carry only an id and a few fields
      if (!c.name) continue;
      if (c.to == null) for (const n of [c.name, ...(c.aliases || [])]) modernNames.add(lookupName(n).toLowerCase());
    }
  }
  for (const rel of civFiles) {
    const list = JSON.parse(readFileSync(join(root, 'data', rel), 'utf8'));
    const outRel = rel.replace(/civilizations(-[^/]*)?\.json$/, (m, suf) => `summaries${suf || ''}.json`);
    if (outRel === rel) continue;
    const need = list.filter((c) => c.summary == null && c.name);
    if (!need.length) continue;
    const summaries = {};
    let found = 0;
    await mapLimit(need, CONCURRENCY, async (c) => {
      const r = await lookupFor(c, modernNames);
      if (!r.title) return;
      found++;
      summaries[c.id] = {
        summary: trimExtract(r.extract),
        source: { name: 'Wikipedia', title: r.title, url: r.url, license: 'CC BY-SA 4.0' },
      };
    });
    // a megabyte of quoted text: one entry per line, no indentation
    const ids = Object.keys(summaries).sort();
    writeFileSync(join(root, 'data', outRel), '{\n' + ids.map((id) => JSON.stringify(id) + ':' + JSON.stringify(summaries[id])).join(',\n') + '\n}\n');
    console.log(`${rel}: ${found} of ${need.length} polities without a summary now have one from Wikipedia -> data/${outRel}`);
  }
  if (failures) console.log(`${failures} lookups failed on the network and were not cached; run again to retry them`);
}
