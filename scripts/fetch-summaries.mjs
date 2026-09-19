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
async function lookup(name, kind) {
  const file = join(CACHE, key(name) + '.json');
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const q = lookupName(name);
  try {
    return await finish(file, await find(q, kind));
  } catch (e) {
    failures++;
    return { title: null };
  }
}

async function finish(file, hit) {
  const out = hit ? { title: hit.title, url: hit.url, extract: hit.extract } : { title: null };
  writeFileSync(file, JSON.stringify(out));
  await sleep(120);
  return out;
}

async function find(q, kind) {
  let hit = null;
  if (!DESCRIPTIVE.test(q) || /culture$/i.test(q)) {
    const s = await summaryOf(q);
    if (s && s.type === 'standard' && s.extract.length > 40) hit = s;
    else if (kind !== 'culture' && !DESCRIPTIVE.test(q)) {
      // disambiguation or nothing: look for the state by that name
      const st = stem(q);
      const titles = await search(`${q} (empire OR kingdom OR dynasty OR state OR civilization OR caliphate OR sultanate OR khanate OR republic)`);
      for (const t of titles) {
        if (st && !t.toLowerCase().includes(st)) continue;
        const s2 = await summaryOf(t);
        if (s2 && s2.type === 'standard' && s2.extract.length > 40) { hit = s2; break; }
      }
    }
  }
  return hit;
}

async function lookupExact(q) {
  const file = join(CACHE, key('q:' + q) + '.json');
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  try {
    const s = await summaryOf(q);
    return await finish(file, s && s.type === 'standard' && s.extract.length > 40 ? s : null);
  } catch (e) {
    failures++;
    return { title: null };
  }
}

// "Egypt" in 3000 BCE must not get the modern republic's opening paragraph,
// and "Persia" in 400 CE must not get Iran's just because Wikipedia
// redirects the name there: a polity that ended before 1900 and lands on a
// present-day country's article is looked up as its ancient self or its
// history instead, or left without a summary
async function lookupFor(c, modernNames) {
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
  let r = await lookup(c.name, c.kind);
  for (const a of c.aliases || []) { if (r.title) break; r = await lookup(a, c.kind); }
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
      if (c.to == null) for (const n of [c.name, ...(c.aliases || [])]) modernNames.add(lookupName(n).toLowerCase());
    }
  }
  for (const rel of civFiles) {
    const list = JSON.parse(readFileSync(join(root, 'data', rel), 'utf8'));
    const outRel = rel.replace(/civilizations(-[^/]*)?\.json$/, (m, suf) => `summaries${suf || ''}.json`);
    if (outRel === rel) continue;
    const need = list.filter((c) => c.summary == null);
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
