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

  async fetchJSON(path) {
    const res = await fetch(this.url(path), { cache: 'force-cache' });
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
    for (const list of lists) {
      for (const c of list) {
        if (!c || !c.id) continue;
        if (this.civs.has(c.id)) console.warn(`duplicate polity id ${c.id}`);
        c._explicit = !!c.color;
        c.color = colorFor(c);
        c.to = c.to == null ? null : c.to;
        this.civs.set(c.id, c);
      }
    }
    this.civList = [...this.civs.values()];
    this._cardIndex = null;

    this.files = (m.borders || []).map((b) => ({
      file: b.file, from: b.from, to: b.to, state: 'idle', promise: null, features: [],
    }));
    return m;
  }

  civ(id) {
    return this.civs.get(id) || null;
  }

  // ---- borders --------------------------------------------------------

  // Loads every border file that covers `year`, and quietly starts the ones
  // that cover the years just ahead so playback never waits at the seam.
  ensureYear(year, lookahead = 150) {
    const wanted = this.files.filter((f) => f.from <= year + lookahead && year - lookahead < f.to);
    const now = wanted.filter((f) => f.from <= year && year < f.to);
    for (const f of wanted) this._loadFile(f);
    return Promise.all(now.map((f) => f.promise));
  }

  _loadFile(f) {
    if (f.state !== 'idle') return f.promise;
    f.state = 'loading';
    f.promise = this.fetchJSON(this.dataDir + f.file).then((fc) => {
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
        feats.push(feat);
      }
      f.features = feats;
      f.state = 'ready';
      this.features.push(...feats);
      this.features.sort((a, b) => b._area - a._area);
      this._recolor();
      if (this.onChange) this.onChange(f);
    }).catch((err) => {
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
  // not share a colour, or the border between them vanishes. Once borders are
  // in, each polity without a colour of its own takes the first palette entry
  // (counting from its hashed default, so the spread stays even) that none of
  // its contemporary neighbours has taken. Bounding boxes on the sphere stand
  // in for adjacency; it is cheap and it errs on the side of caution.
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
    for (const g of list) g._idx = g.civ._explicit ? index(g.civ.color) : null;
    for (const g of list) {
      if (g.civ._explicit) continue;
      const taken = new Set();
      for (const h of list) if (h !== g && h._idx != null && overlap(g, h) && touch(g, h)) taken.add(h._idx);
      const start = index(colorFor({ id: g.civ.id })) ?? 0;
      let idx = start;
      for (let k = 0; k < N; k++) { const i = (start + k) % N; if (!taken.has(i)) { idx = i; break; } }
      g._idx = idx;
      g.civ.color = PALETTE[idx];
    }
  }

  // true when every file that covers this year has arrived (or failed)
  isYearReady(year) {
    return this.files.filter((f) => f.from <= year && year < f.to)
      .every((f) => f.state === 'ready' || f.state === 'error');
  }

  hasFilesFor(year) {
    return this.files.some((f) => f.from <= year && year < f.to);
  }

  // Border features on the map in `year`, largest first.
  polities(year) {
    return this.features.filter((f) => activeAt(f.properties, year));
  }

  // The features of one polity in a given year (a kingdom can be several
  // polygons: an empire and its exclaves, or a border redrawn mid-reign).
  featuresOf(id, year) {
    return this.features.filter((f) => f._civ.id === id && activeAt(f.properties, year));
  }

  // Any year in which this polity has a border drawn, nearest to `year`.
  // Used when a link says "Ottoman Empire, 1922" but the closest drawn border
  // is the 1914 snapshot.
  nearestDrawnYear(id, year) {
    const feats = this.features.filter((f) => f._civ.id === id);
    if (!feats.length) return null;
    if (feats.some((f) => activeAt(f.properties, year))) return year;
    let best = null, bestD = Infinity;
    for (const f of feats) {
      const { from, to } = f.properties;
      const y = year < from ? from : Math.min(to - 1, to === Infinity ? from : to - 1);
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
      const res = await fetch(this.url(this.dataDir + path), { cache: 'force-cache' });
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
