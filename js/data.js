// Everything the explorer knows about the past comes through here: the
// manifest, the polity index, the border files (loaded lazily by the years
// they cover, so a phone opening the Bronze Age never downloads 1914), the
// info cards, and the base geography. See DATA-FORMAT.md for the files.

import { PALETTE, colorFor } from './palette.js';

const geo = globalThis.d3;
const topo = globalThis.topojson;

// A border feature is on the map at `year` when from <= year < to. `to` is
// exclusive so that a polity that fell in 1368 and its successor that rose in
// 1368 never share a frame.
export function activeAt(props, year) {
  return props.from <= year && year < props.to;
}

// Imported snapshot spans describe coverage, not a society's lifetime.
// Only dates represented as historical can constrain a supplied polygon.
export function isHistorical(c) {
  return c.dateBasis === 'historical' ||
    (c.dateBasis !== 'map_coverage' && !c.circa && !String(c.generated || '').startsWith('natural-earth'));
}
export function drawableInterval(feature) {
  const c = feature._civ;
  const historical = isHistorical(c);
  return {
    from: historical ? Math.max(feature.properties.from, c.from) : feature.properties.from,
    to: historical ? Math.min(feature.properties.to, c.to ?? Infinity) : feature.properties.to,
  };
}

// A researched polity usually rises between two snapshots: the Ming took
// China in 1368 and the first map that draws them is the 1400 one. Rather
// than leave the country blank until then, a polity's earliest shape reaches
// back to its founding, within this many years. Only backwards: a fallen
// state's last shape must not linger, since a rump is usually far smaller
// than the map it came from.
export const BACKFILL_YEARS = 150;

// d3 reads polygons on the sphere, where a ring has two sides: the winding
// order says which is inside. Its convention (exterior rings clockwise, holes
// the other way) is the opposite of the GeoJSON specification's, and the
// research files may arrive either way, so every ring is checked by area and
// flipped if it claims to enclose most of the planet.
const HALF_SPHERE = 2 * Math.PI;
function rewindRing(ring, isHole) {
  const area = geo.geoArea({ type: 'Polygon', coordinates: [ring] });
  if ((area > HALF_SPHERE) !== isHole) ring.reverse();
}
export function rewind(geometry) {
  if (!geometry) return geometry;
  if (geometry.type === 'Polygon') geometry.coordinates.forEach((r, i) => rewindRing(r, i > 0));
  else if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach((p) => p.forEach((r, i) => rewindRing(r, i > 0)));
  else if (geometry.type === 'GeometryCollection') geometry.geometries.forEach(rewind);
  return geometry;
}

// words of two letters or more, lower case, apostrophes kept inside them
const tokens = (text) => text.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter((w) => w.length >= 2);

// true when b is a with one letter changed, dropped or added
function oneEditApart(a, b) {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

// where the first of the matched words begins in the text, or -1
function firstMention(text, matched) {
  const lower = text.toLowerCase();
  let at = -1;
  for (const w of matched) {
    const i = lower.search(new RegExp('(^|[^\\p{L}\\p{N}])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'));
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  return at;
}

// the stretch of a summary around the first matched word, cut at word
// boundaries to about 110 characters
function snippetAround(text, matched) {
  const at = firstMention(text, matched);
  if (at < 0) return text.slice(0, 110).trim();
  let start = Math.max(0, at - 40), end = Math.min(text.length, at + 70);
  if (start > 0) { const sp = text.lastIndexOf(' ', start); start = sp > 0 && sp > start - 15 ? sp + 1 : start; }
  if (end < text.length) { const sp = text.indexOf(' ', end); end = sp > 0 && sp < end + 15 ? sp : end; }
  return (start > 0 ? '\u2026' : '') + text.slice(start, end).trim() + (end < text.length ? '\u2026' : '');
}

export class HistoryData {
  constructor(base = '') {
    this.base = base;
    this.manifest = null;
    this.civs = new Map();      // id -> polity entry
    this.civList = [];
    this.files = [];            // manifest border entries with load state
    this.features = [];         // every loaded border feature, decorated
    this.onChange = null;       // called when new borders arrive
    this.baseLayers = null;
    this.landHi = null;
    this._landHiPromise = null;
  }

  url(path) {
    return this.base + path;
  }

  async fetchJSON(path, options = {}) {
    // Revalidate mutable JSON after a deployment. Force-cache can preserve
    // an old card index indefinitely and hide newly published research.
    const res = await fetch(this.url(path), { ...options, cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status} loading ${path}`);
    return res.json();
  }

  async load(manifestPath = 'data/manifest.json') {
    const m = await this.fetchJSON(manifestPath);
    this.manifest = m;
    const dir = manifestPath.replace(/[^/]*$/, '');
    this.dataDir = dir;

    const civFiles = Array.isArray(m.civilizations) ? m.civilizations : [m.civilizations];
    const lists = await Promise.all(civFiles.map((f) => this.fetchJSON(dir + f)));
    // the same id in a later file overrides the fields it names, so a
    // researched entry can replace an imported one without deleting it
    for (const list of lists) {
      for (const c of list) {
        if (!c || !c.id) continue;
        const prev = this.civs.get(c.id);
        const merged = prev ? Object.assign(prev, Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined))) : c;
        merged.to = merged.to == null ? null : merged.to;
        this.civs.set(merged.id, merged);
      }
    }
    for (const c of this.civs.values()) {
      c._explicit = !!c.color;
      c.color = colorFor(c);
    }
    this.civList = [...this.civs.values()];
    this._cardIndex = null;
    this.summaryFiles = Array.isArray(m.summaries) ? m.summaries : (m.summaries ? [m.summaries] : []);
    this._summaries = null;

    // priority 1 marks a researched border file: coarse extents that fill
    // the years the imported snapshots lack. Where a polity has both for a
    // year, the imported outline draws (see polities); a wrong snapshot is
    // fixed in the importer's tables, never by drawing over it
    this.files = (m.borders || []).map((b) => ({
      file: b.file, from: b.from, to: b.to, priority: b.priority || 0, state: 'idle', promise: null, features: [],
    }));
    return m;
  }

  civ(id) {
    return this.civs.get(id) || null;
  }

  // ---- borders --------------------------------------------------------

  // Current coverage always wins. At most two next snapshots are prefetched,
  // after current downloads finish. Coordinate count bounds optional decoded
  // geometry, rather than pretending compressed transfer size measures heap.
  ensureYear(year, lookahead = 150) {
    this._requestedYear = year;
    const now = this.files.filter((f) => activeAt(f, year));
    const next = this.files.filter((f) => f.from > year && f.from <= year + lookahead && !f.prefetchSkipped)
      .sort((a, b) => a.from - b.from).slice(0, 2);
    this._wantedFiles = new Set([...now, ...next]);
    for (const f of this.files) {
      if (!this._wantedFiles.has(f) && (f.state === 'ready' || f.state === 'loading')) this._evict(f);
    }
    const pending = now.map((f) => this._loadFile(f));
    return Promise.all(pending).then(() => {
      if (this._requestedYear !== year || !this.isYearReady(year)) return;
      for (const f of next) this._loadFile(f);
      this._trimCache();
    });
  }

  _trimCache() {
    const optional = this.files.filter((f) => f.state === 'ready' && !activeAt(f, this._requestedYear))
      .sort((a, b) => Math.abs(a.from - this._requestedYear) - Math.abs(b.from - this._requestedYear));
    let positions = 0;
    for (const f of optional) {
      positions += f.positions || 0;
      if (!this._wantedFiles?.has(f) || positions > 120000) {
        f.prefetchSkipped = true;
        this._evict(f);
      }
    }
  }

  _evict(f) {
    f.controller?.abort();
    f.request = null;
    const gone = new Set(f.features);
    this.features = this.features.filter((x) => !gone.has(x));
    f.features = [];
    f.state = 'idle';
    f.promise = null;
    f.positions = 0;
  }

  // Explicit retry avoids a failing connection creating an automatic loop.
  retryYear(year) {
    for (const f of this.files) if (activeAt(f, year) && f.state === 'error') {
      f.state = 'idle';
      f.promise = null;
      f.error = null;
    }
    return this.ensureYear(year);
  }

  yearStatus(year) {
    const files = this.files.filter((f) => activeAt(f, year));
    const failed = files.filter((f) => f.state === 'error');
    return { state: !files.length ? 'missing' : failed.length ? 'error' :
      files.every((f) => f.state === 'ready') ? 'ready' : 'loading', failed };
  }

  _loadFile(f) {
    if (f.state !== 'idle') return f.promise;
    f.state = 'loading';
    f.controller = new AbortController();
    const request = f.request = {};
    f.promise = this.fetchJSON(this.dataDir + f.file, { signal: f.controller.signal }).then((raw) => {
      if (f.request !== request) return;
      // border files may be TopoJSON (shared arcs, a third the size) or GeoJSON
      const fc = raw.type === 'Topology' ? topo.feature(raw, raw.objects[Object.keys(raw.objects)[0]]) : raw;
      const feats = [];
      for (const feat of fc.features || []) {
        const p = feat.properties || {};
        const civ = this.civs.get(p.civ);
        if (!civ) { console.warn(`${f.file}: feature for unknown polity ${p.civ}`); continue; }
        if (typeof p.from !== 'number') p.from = civ.from;
        if (typeof p.to !== 'number') p.to = civ.to == null ? Infinity : civ.to;
        feat.properties = p;
        rewind(feat.geometry);
        // spherical area (steradians) orders drawing big-to-small so small
        // polities stay tappable inside large ones; the centroid anchors the label
        feat._area = geo.geoArea(feat);
        feat._centroid = geo.geoCentroid(feat);
        feat._civ = civ;
        feat._priority = f.priority;
        feats.push(feat);
      }
      const count = (coords) => !Array.isArray(coords) ? 0 : typeof coords[0] === 'number'
        ? 1 : coords.reduce((sum, child) => sum + count(child), 0);
      f.positions = feats.reduce((sum, feat) => sum + count(feat.geometry?.coordinates), 0);
      f.features = feats;
      f.state = 'ready';
      this.features.push(...feats);
      this.features.sort((a, b) => b._area - a._area);
      this._trimCache();
      this._recolor();
      if (this.onChange) this.onChange(f);
    }).catch((err) => {
      if (f.request !== request) return;
      f.error = err;
      f.state = 'error';
      console.error(err);
      if (this.onChange) this.onChange(f);
    });
    return f.promise;
  }

  loadingCount() {
    return this.files.filter((f) => f.state === 'loading').length;
  }

  // Two polities that share a stretch of time and a stretch of ground must
  // not share a colour, or the border between them vanishes. As borders come
  // in, each polity without a colour of its own takes the first palette entry
  // (counting from its hashed default, so the spread stays even) that none of
  // its contemporary neighbours has taken. Bounding boxes on the sphere stand
  // in for adjacency; it is cheap and it errs on the side of caution. A colour
  // once given is kept, so nothing flickers when files load or are let go.
  _recolor() {
    const groups = new Map();
    for (const f of this.features) {
      const c = f._civ;
      let g = groups.get(c.id);
      if (!g) { g = { civ: c, lon: [], lat: [Infinity, -Infinity], from: c.from, to: c.to == null ? Infinity : c.to }; groups.set(c.id, g); }
      if (!f._bbox) f._bbox = geo.geoBounds(f);
      const [[x0, y0], [x1, y1]] = f._bbox;
      // a box across the antimeridian comes back with x0 > x1
      if (x0 <= x1) g.lon.push([x0, x1]); else g.lon.push([x0, 180], [-180, x1]);
      g.lat[0] = Math.min(g.lat[0], y0); g.lat[1] = Math.max(g.lat[1], y1);
    }
    const list = [...groups.values()].sort((a, b) => (a.civ.id < b.civ.id ? -1 : 1));
    const PAD = 1.5;
    const touch = (a, b) =>
      a.lat[0] - PAD < b.lat[1] && b.lat[0] - PAD < a.lat[1] &&
      a.lon.some(([p, q]) => b.lon.some(([r, t]) => p - PAD < t && r - PAD < q));
    const overlap = (a, b) => a.from < b.to && b.from < a.to;
    const N = PALETTE.length;
    const index = (color) => { const i = PALETTE.indexOf(color); return i < 0 ? null : i; };
    for (const g of list) g._idx = g.civ._explicit || g.civ._colored ? index(g.civ.color) : null;
    for (const g of list) {
      if (g.civ._explicit || g.civ._colored) continue;
      const taken = new Set();
      for (const h of list) if (h !== g && h._idx != null && overlap(g, h) && touch(g, h)) taken.add(h._idx);
      const start = index(colorFor({ id: g.civ.id })) ?? 0;
      let idx = start;
      for (let k = 0; k < N; k++) { const i = (start + k) % N; if (!taken.has(i)) { idx = i; break; } }
      g._idx = idx;
      g.civ.color = PALETTE[idx];
      g.civ._colored = true;
    }
  }

  // ---- summaries ------------------------------------------------------
  // Hand-written summaries sit in the polity entry. The rest (thousands of
  // Wikipedia openings) live in separate files fetched the first time one is
  // needed, so the index a phone loads up front stays small.

  loadSummaries() {
    if (!this._summaries) {
      this._summaries = Promise.all(this.summaryFiles.map((f) => this.fetchJSON(this.dataDir + f).catch((e) => { console.warn(e); return {}; })))
        .then((parts) => Object.assign({}, ...parts));
    }
    return this._summaries;
  }

  // { text, source } or null; source is { name, title, url, license } when
  // the text is quoted from somewhere and must say so
  async summaryFor(id) {
    const civ = this.civs.get(id);
    if (!civ) return null;
    if (civ.summary) return { text: civ.summary, source: civ.summarySource || null };
    if (!this.summaryFiles.length) return null;
    const all = await this.loadSummaries();
    const e = all[id];
    return e && e.summary ? { text: e.summary, source: e.source || null } : null;
  }

  // A failed transfer is never evidence of an empty historical world.
  isYearReady(year) {
    return this.files.filter((f) => f.from <= year && year < f.to)
      .every((f) => f.state === 'ready');
  }

  hasFilesFor(year) {
    return this.files.some((f) => f.from <= year && year < f.to);
  }

  // Border features on the map in `year`, largest first.
  // A polity with an imported border in that year shows only that one.
  polities(year) {
    const active = this.features.filter((f) => activeAt(drawableInterval(f), year));
    // researched polities alive this year with no shape yet: their earliest
    // later shape stands in (see BACKFILL_YEARS)
    const drawn = new Set(active.map((f) => f._civ.id));
    const reach = new Map();
    for (const f of this.features) {
      const c = f._civ, a = f.properties.from;
      if (drawn.has(c.id) || a <= year || a - year > BACKFILL_YEARS) continue;
      if (!isHistorical(c) || !(c.from <= year && year < (c.to ?? Infinity))) continue;
      if (!reach.has(c.id) || a < reach.get(c.id)) reach.set(c.id, a);
    }
    if (reach.size) for (const f of this.features) if (reach.get(f._civ.id) === f.properties.from) active.push(f);
    // where the import and a researched file both draw a polity this year,
    // the import's outline was traced from an atlas and the researched shape
    // is a coarse extent, so the import draws and the researched shape fills
    // only the years the import lacks (Amy saw Qwen's Western Zhou hexagon
    // sitting in a hole in the Sinic ring where the imported Zhou belonged).
    // The exception is a researched shape marked `over`: the snapshot is
    // wrong for those years and nothing in the importer's tables can mend
    // it (the 1200 map gives the Southern Song all of China), so the
    // researched shape draws instead
    const imported = new Set(), over = new Set();
    for (const f of active) {
      if (!(f._priority > 0)) imported.add(f._civ.id);
      else if (f.properties.over) over.add(f._civ.id);
    }
    if (!imported.size) return active;
    return active.filter((f) => (f._priority > 0 ? f.properties.over || !imported.has(f._civ.id) : !over.has(f._civ.id)));
  }

  // The features of one polity in a given year (a kingdom can be several
  // polygons: an empire and its exclaves, or a border redrawn mid-reign).
  featuresOf(id, year) {
    return this.polities(year).filter((f) => f._civ.id === id);
  }

  // The years of the border files that could hold a drawn border for this
  // polity, nearest to `year` first, so a page can look through them in
  // order until one has it.
  candidateYearsFor(id, year) {
    const c = this.civs.get(id);
    if (!c) return [];
    const to = c.to == null ? Infinity : c.to;
    return this.files
      .filter((f) => f.from < to && c.from < f.to)
      .map((f) => Math.max(f.from, c.from))
      .filter((y, i, a) => a.indexOf(y) === i)
      .sort((a, b) => Math.abs(a - year) - Math.abs(b - year));
  }

  // Any year in which this polity has a border drawn, nearest to `year`.
  // Used when a link says "Ottoman Empire, 1922" but the closest drawn border
  // is the 1914 snapshot.
  nearestDrawnYear(id, year) {
    const feats = this.features.filter((f) => f._civ.id === id);
    if (!feats.length) return null;
    if (feats.some((f) => activeAt(drawableInterval(f), year))) return year;
    let best = null, bestD = Infinity;
    for (const f of feats) {
      const { from, to } = drawableInterval(f);
      if (from >= to) continue;
      let y = year < from ? from : to - 1;
      if (y === 0) y = year < from ? 1 : -1;
      if (!activeAt({ from, to }, y)) continue;
      const d = Math.abs(y - year);
      if (d < bestD) { bestD = d; best = y; }
    }
    return best;
  }

  // ---- polities -------------------------------------------------------

  search(q, limit = 8) {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const starts = [], contains = [];
    for (const c of this.civList) {
      const names = [c.name, ...(c.aliases || [])].filter(Boolean).map((n) => n.toLowerCase());
      if (names.some((n) => n.startsWith(s))) starts.push(c);
      else if (names.some((n) => n.includes(s))) contains.push(c);
      if (starts.length >= limit) break;
    }
    return [...starts, ...contains].slice(0, limit);
  }

  // The text too, so a king finds his kingdom: "genghis" finds the Mongol
  // Empire through its figures and the khanates through the sentences that
  // name him. Each polity's figures, capital, region and summaries (its own
  // and the quoted one, fetched on first use) are split into words once; a
  // query word matches a word by prefix or, from five letters, with one
  // letter wrong, missing or extra, so a common misspelling still lands.
  // Every word of the query must match in the same polity. A match among
  // the figures or the capital ranks first, then an early mention in the
  // summary before a late one. Polities already found by name are left out.
  async searchText(q, limit = 8, exclude = new Set()) {
    const words = tokens(q);
    if (!words.length) return [];
    const index = await this._textIndex();
    if (!index) return [];
    let ids = null;
    const matched = [];
    for (const w of words) {
      const hits = new Set();
      for (const [word, set] of index.words) {
        if (word.startsWith(w) || (w.length >= 5 && oneEditApart(w, word))) {
          matched.push(word);
          for (const id of set) hits.add(id);
        }
      }
      ids = ids ? new Set([...ids].filter((id) => hits.has(id))) : hits;
      if (!ids.size) return [];
    }
    const out = [];
    for (const id of ids) {
      if (exclude.has(id)) continue;
      const civ = this.civs.get(id);
      if (!civ) continue;
      const entry = index.texts.get(id);
      const at = firstMention(entry.text, matched);
      const inFacts = firstMention(entry.facts, matched) >= 0;
      out.push({ civ, snippet: inFacts ? entry.facts : snippetAround(entry.text, matched), score: (inFacts ? 0 : 1e6) + (at < 0 ? 1e5 : at) });
    }
    out.sort((a, b) => a.score - b.score);
    return out.slice(0, limit).map(({ civ, snippet }) => ({ civ, snippet }));
  }

  _textIndex() {
    if (this._textIndexPromise) return this._textIndexPromise;
    const quoted = this.summaryFiles.length ? this.loadSummaries() : Promise.resolve({});
    this._textIndexPromise = quoted.then((all) => {
      const words = new Map(), texts = new Map();
      const add = (id, text) => {
        for (const w of tokens(text)) {
          let set = words.get(w);
          if (!set) words.set(w, (set = new Set()));
          set.add(id);
        }
      };
      for (const c of this.civList) {
        const facts = [c.figures && c.figures.length ? `Figures: ${c.figures.join(', ')}` : '', c.capital ? `Capital: ${c.capital}` : '', c.region || ''].filter(Boolean).join(' \u00b7 ');
        const own = c.summary || '';
        const q = all && all[c.id] && all[c.id].summary ? all[c.id].summary : '';
        if (!facts && !own && !q) continue;
        const text = own && q && own !== q ? `${own} ${q}` : own || q;
        texts.set(c.id, { facts, text });
        add(c.id, `${facts} ${text}`);
      }
      return { words, texts };
    }).catch(() => null);
    return this._textIndexPromise;
  }

  // How many polities the index says existed in each of `bins` slices of the
  // timeline (in slider space, so the histogram lines up with the track).
  density(scale, bins) {
    const out = new Array(bins).fill(0);
    for (const c of this.civList) {
      const t0 = scale.toT(c.from), t1 = scale.toT(c.to == null ? scale.end : c.to);
      const i0 = Math.max(0, Math.floor(t0 * bins)), i1 = Math.min(bins - 1, Math.floor(t1 * bins));
      for (let i = i0; i <= i1; i++) out[i]++;
    }
    return out;
  }

  // ---- cards ----------------------------------------------------------

  // cards/index.json lists the polities that have a card, so the page never
  // asks for a file that is not there (scripts/validate.mjs rewrites it)
  async cardIndex() {
    if (this._cardIndex) return this._cardIndex;
    const pattern = (this.manifest && this.manifest.cards) || 'cards/{id}.json';
    const dir = pattern.replace(/[^/]*$/, '');
    this._cardIndex = this.fetchJSON(this.dataDir + dir + 'index.json')
      .then((list) => new Set(Array.isArray(list) ? list : []))
      .catch(() => null);
    return this._cardIndex;
  }

  async hasCard(id) {
    const civ = this.civs.get(id);
    if (!civ) return false;
    if (civ.card) return true;
    const idx = await this.cardIndex();
    return idx ? idx.has(id) : true;
  }

  async card(id) {
    const civ = this.civs.get(id);
    if (!civ || !(await this.hasCard(id))) return null;
    const pattern = (this.manifest && this.manifest.cards) || 'cards/{id}.json';
    const path = civ.card || pattern.replace('{id}', id);
    try {
      const res = await fetch(this.url(this.dataDir + path), { cache: 'no-cache' });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  // ---- base geography -------------------------------------------------

  async loadBase() {
    if (this.baseLayers) return this.baseLayers;
    const b = (this.manifest && this.manifest.base) || {};
    const [land, lakes, rivers] = await Promise.all([
      this.fetchJSON(b.land || 'base/land-110m.json'),
      b.lakes ? this.fetchJSON(b.lakes) : null,
      b.rivers ? this.fetchJSON(b.rivers) : null,
    ]);
    if (lakes && lakes.features) lakes.features.forEach((f) => rewind(f.geometry));
    this.baseLayers = {
      land: land.type === 'Topology' ? topo.feature(land, land.objects.land) : land,
      lakes,
      rivers,
      // at world scale only the great rivers draw, or Siberia turns to lace
      riversMajor: rivers && rivers.features
        ? { type: 'FeatureCollection', features: rivers.features.filter((f) => (f.properties.scalerank ?? 0) <= 2) }
        : null,
    };
    return this.baseLayers;
  }

  // the 1:50m coastline, fetched once the user zooms in far enough to see it
  loadLandHi() {
    const b = (this.manifest && this.manifest.base) || {};
    if (!b.landHi) return Promise.resolve(null);
    if (!this._landHiPromise) {
      this._landHiPromise = this.fetchJSON(b.landHi).then((t) => {
        this.landHi = t.type === 'Topology' ? topo.feature(t, t.objects.land) : t;
        return this.landHi;
      }).catch((e) => { console.warn(e); return null; });
    }
    return this._landHiPromise;
  }
}
