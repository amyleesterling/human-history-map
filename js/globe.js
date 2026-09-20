// The Earth on a canvas. One class draws both the globe (orthographic, the
// default) and the flat map (Natural Earth), takes touch and mouse gestures,
// and answers "what did the finger land on" with a spherical point-in-polygon
// test, so nothing here depends on the DOM beyond the canvas itself. The card
// page reuses it non-interactively for its small extent map.
//
// Rendering is two layers: the base (ocean, graticule, land, lakes, rivers)
// is drawn to an offscreen canvas and kept until the view changes, and the
// polities and labels are drawn fresh every frame. During playback the view
// is still, so each frame costs only the borders on the map that year, and a
// phone keeps up.

import { withAlpha, tint } from './palette.js';

const d3 = globalThis.d3;

// Two skins, one renderer. The atlas is a chart drawn by hand: paper, one
// ink, and washes of colour that stop at the coast; the sea a cooler,
// darker sheet than the land, the coastline inked with a water lining. The
// sci-fi globe is a dark projection: a deep sea lit from the upper left,
// slate land with a cold light along its coasts, polities as translucent
// panes with a lit edge, and a haze outside the disc. Nothing in either is
// warm, by Amy's rule that nothing on the site is orange.
const STYLES = {
  atlas: {
    seaInner: '#e6e4da', seaOuter: '#cbcabe', flatSea: '#e0dfd3',
    land: '#f1ecdf', ink: '35, 41, 58', edge: 0.72,
    lake: '#d3d9d8', river: 'rgba(70,95,130,.55)', graticule: 0.09,
    label: '#1f2533', halo: 'rgba(241,236,226,.92)', people: 'rgba(35,41,58,.62)', selectedLabel: '#000000',
    select: '#1b2230', lining: 'rgba(35,41,58,', grain: true, wobble: true, blend: 'multiply',
  },
  scifi: {
    seaInner: '#1c3752', seaOuter: '#0a1729', flatSea: '#0f2136',
    land: '#2f333a', ink: '226, 236, 250', edge: 0.3,
    lake: '#153052', river: 'rgba(120,170,220,.55)', graticule: 0.07,
    label: '#f5f1e8', halo: 'rgba(8,10,14,.8)', people: 'rgba(245,241,232,.72)', selectedLabel: '#ffffff',
    select: '#ffffff', lining: 'rgba(120,170,240,', grain: false, wobble: false, blend: 'source-over',
    glow: 'rgba(120,170,240,.22)', ring: 'rgba(170,205,255,.35)', hud: '126, 224, 255',
  },
};
const inkOf = (S, alpha) => `rgba(${S.ink},${alpha})`;

// The seas named as the engraved charts name them, lettered faintly into
// the sheet of the atlas skin (ornament, so drawn with the cached base);
// [name, lon, lat]
const SEAS = [
  ['Oceanus Atlanticus', -33, 12], ['Oceanus Pacificus', -150, -8], ['Oceanus Pacificus', 158, 20],
  ['Oceanus Indicus', 80, -24], ['Oceanus Arcticus', 0, 82], ['Oceanus Australis', 15, -62],
];

// The lettering of an engraved chart: states in spaced Roman capitals, a
// people's range in spaced italic capitals, the way the classical maps set
// GERMANIA beside the Roman Empire (vendor/fonts, both SIL OFL). Each has
// the platform's serifs behind it while it loads.
const STATE_FACE = '"Cinzel", "Trajan Pro", "Times New Roman", Georgia, serif';
const PEOPLE_FACE = '"EB Garamond", Garamond, "Times New Roman", Georgia, serif';
const labelFont = (fs, culture) => (culture ? `italic ${fs}px ${PEOPLE_FACE}` : `600 ${fs}px ${STATE_FACE}`);
const LABEL_SPACING = { state: '0.12em', culture: '0.08em' };

// The grain of laid paper: a tile of sparse dark and light flecks, drawn
// once from a fixed seed so the sheet is the same on every visit.
function makeGrain() {
  const size = 160;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  let seed = 20260920;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rnd();
    const dark = v < 0.05, light = v > 0.93;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = dark ? 60 : 255;
    img.data[i + 3] = dark ? 22 : light ? 44 : 0;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// A pen never draws a perfectly smooth line. Every projected point is nudged
// by a little value noise keyed to where it lands on screen: under a pixel,
// the same for every shape that shares a border, and still from frame to
// frame while the view is still.
const WOBBLE = 1.0, CELL = 7;
function corner(i, j) {
  let n = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 2147483647.5 - 1;
}
function noise(x, y) {
  const x0 = Math.floor(x / CELL), y0 = Math.floor(y / CELL);
  let fx = x / CELL - x0, fy = y / CELL - y0;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = corner(x0, y0), b = corner(x0 + 1, y0), c = corner(x0, y0 + 1), d = corner(x0 + 1, y0 + 1);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
const wobble = d3.geoTransform({
  point(x, y) { this.stream.point(x + noise(x, y) * WOBBLE, y + noise(y + 311, x + 97) * WOBBLE); },
});

// zoom (relative to the fitted globe) past which the 1:50m coastline is worth
// its download, and the zoom range gestures are allowed. At 96 a phone shows
// about a degree and a half across, enough to read the names of the small
// German states of 1831 (Amy could not at 16), and the projection is clipped
// to the viewport and the geometry culled by bounding box so the frame cost
// does not grow with the zoom.
const HI_ZOOM = 2.6;
const MIN_ZOOM = 1;
const MAX_ZOOM = 96;
// How far a state's wash reaches past its drawn edge into unclaimed land
// and sea (the land mask cuts the sea off), and how far inside the coast
// the polity ink stops. The sources' coasts are rough by their own account:
// Amy saw Egypt stop a strip short of the Mediterranean and run into the
// Red Sea, with its own edge inked inland of the shore. Within this
// distance of the sea the coastline is the border.
const REACH_KM = 25;
// zoom from which geometry outside the viewport is skipped before drawing
const CULL_ZOOM = 3;

const clampLat = (lat) => Math.max(-90, Math.min(90, lat));
const wrapLon = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Globe {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.interactive = opts.interactive !== false;
    this.onTap = opts.onTap || null;
    this.onViewChange = opts.onViewChange || null;
    this.onNeedLandHi = opts.onNeedLandHi || null;
    this.labels = opts.labels !== false;
    // 'atlas' (the default pages) or 'scifi' (the generated sci-fi pages)
    this.skin = opts.skin === 'scifi' ? 'scifi' : 'atlas';
    this.S = STYLES[this.skin];
    // the sci-fi lock-on: which polity the brackets hold, since when, and
    // where the card is so the leader can reach it
    this._lockId = null;
    this._lockT0 = 0;
    this._cardRect = null;
    this._reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mode = opts.mode === 'flat' ? 'flat' : 'globe';
    this.view = { lon: 30, lat: 25, zoom: 1, ...(opts.view || {}) };
    this.polities = [];
    this.selectedId = null;
    this.base = null;
    this.landHi = null;
    this.width = 0; this.height = 0; this.dpr = 1;
    this.baseCanvas = document.createElement('canvas');
    this.baseCtx = this.baseCanvas.getContext('2d');
    // the land as a mask, kept with the base, and a layer the washes are
    // painted on each frame before the mask cuts them at the coast
    this.maskCanvas = document.createElement('canvas');
    this.maskCtx = this.maskCanvas.getContext('2d');
    this.washCanvas = document.createElement('canvas');
    this.washCtx = this.washCanvas.getContext('2d');
    // the land shrunk by the coast reach, which masks the ink; the reach
    // itself; and the ink (see _drawWashes)
    this.erodedCanvas = document.createElement('canvas');
    this.erodedCtx = this.erodedCanvas.getContext('2d');
    this.reachCanvas = document.createElement('canvas');
    this.reachCtx = this.reachCanvas.getContext('2d');
    this.inkCanvas = document.createElement('canvas');
    this.inkCtx = this.inkCanvas.getContext('2d');
    this.baseDirty = true;
    this._raf = 0;
    this._anim = null;
    this._pointers = new Map();
    this._textWidths = new Map();
    this._askedHi = false;
    this._setupProjection();
    if (this.interactive) this._bindGestures();
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(canvas.parentElement || canvas);
    this.resize();
    // once the lettering faces arrive, the measured widths are stale and the
    // names are drawn again in them
    if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load(labelFont(12, false)), document.fonts.load(labelFont(12, true))])
        .then(() => { this._textWidths.clear(); this.render(); }).catch(() => {});
    }
  }

  destroy() {
    this._ro.disconnect();
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  // ---- data in --------------------------------------------------------

  setBase(layers) { this.base = layers; this.baseDirty = true; this.render(); }
  setLandHi(land) { this.landHi = land; this.baseDirty = true; this.render(); }
  // cultural regions go under states whatever their size, so a state inside
  // a people's range stays visible and tappable
  setPolities(list) {
    const rank = (f) => (f._civ.kind === 'culture' ? 0 : 1);
    this.polities = list.slice().sort((a, b) => rank(a) - rank(b) || b._area - a._area);
    this.render();
  }
  setSelected(id) { this.selectedId = id; this.render(); }
  // the card's box in canvas pixels (or null when it is closed), for the
  // sci-fi leader line
  setCardRect(rect) { this._cardRect = rect || null; if (this.skin === 'scifi') this.render(); }

  setMode(mode) {
    mode = mode === 'flat' ? 'flat' : 'globe';
    if (mode === this.mode) return;
    this.mode = mode;
    this._setupProjection();
    this.render();
    this._emitView();
  }

  getView() { return { ...this.view }; }

  setView(v, { silent = false } = {}) {
    this._stopAnim();
    this.view = {
      lon: wrapLon(v.lon ?? this.view.lon),
      lat: clampLat(v.lat ?? this.view.lat),
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom ?? this.view.zoom)),
    };
    this._applyView();
    this.render();
    if (!silent) this._emitView();
  }

  // glide the view to a new centre and zoom
  animateTo(target, duration = 800) {
    this._stopAnim();
    const from = { ...this.view };
    const to = {
      lon: wrapLon(target.lon ?? from.lon),
      lat: clampLat(target.lat ?? from.lat),
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, target.zoom ?? from.zoom)),
    };
    // spin the short way round
    let dlon = to.lon - from.lon;
    if (dlon > 180) dlon -= 360;
    if (dlon < -180) dlon += 360;
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / duration);
      const k = easeInOut(u);
      this.view = {
        lon: wrapLon(from.lon + dlon * k),
        lat: from.lat + (to.lat - from.lat) * k,
        zoom: Math.exp(Math.log(from.zoom) + (Math.log(to.zoom) - Math.log(from.zoom)) * k),
      };
      this._applyView();
      this.draw();
      if (u < 1) this._anim = requestAnimationFrame(step);
      else { this._anim = null; this._emitView(); }
    };
    this._anim = requestAnimationFrame(step);
  }

  _stopAnim() {
    if (this._anim) { cancelAnimationFrame(this._anim); this._anim = null; }
  }

  // A zoom that shows this feature at about half the viewport. The angular
  // extent comes from its bounding box on the sphere; the fitted globe shows
  // 180 degrees across its diameter, so zoom is roughly 90 / extent.
  fitZoomFor(features) {
    const list = Array.isArray(features) ? features : [features];
    const fc = { type: 'FeatureCollection', features: list };
    const [[x0, y0], [x1, y1]] = d3.geoBounds(fc);
    let dlon = x1 - x0;
    if (dlon < 0) dlon += 360;
    const midLat = (y0 + y1) / 2;
    const ext = Math.max(dlon * Math.cos((midLat * Math.PI) / 180), y1 - y0, 3);
    const z = this.mode === 'globe' ? 95 / ext : 130 / ext;
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
  }

  focusFeatures(features, { animate = true, zoom } = {}) {
    const list = Array.isArray(features) ? features : [features];
    if (!list.length) return;
    const fc = { type: 'FeatureCollection', features: list };
    const c = d3.geoCentroid(fc);
    // a small state is shown at half the viewport like any other, up to a
    // zoom that still shows its neighbours
    const target = { lon: c[0], lat: c[1], zoom: zoom ?? Math.min(this.fitZoomFor(list), 40) };
    if (animate) this.animateTo(target);
    else this.setView(target);
  }

  // ---- projection -----------------------------------------------------

  _setupProjection() {
    this.projection = this.mode === 'globe'
      ? d3.geoOrthographic().clipAngle(90).precision(0.4)
      : d3.geoNaturalEarth1().precision(0.4);
    this.path = d3.geoPath(this.projection, this.ctx);
    this.basePath = d3.geoPath(this.projection, this.baseCtx);
    // the pen: the same projection with the wobble on every point, for all
    // that a hand would draw; the sphere and the graticule keep the ruler.
    // The sci-fi projection is drawn by a machine and has no wobble.
    const pen = this.S.wobble
      ? { stream: (s) => this.projection.stream(wobble.stream(s)) }
      : { stream: (s) => this.projection.stream(s) };
    this.basePenPath = d3.geoPath(pen, this.baseCtx);
    this.maskPenPath = d3.geoPath(pen, this.maskCtx);
    this.washPenPath = d3.geoPath(pen, this.washCtx);
    this.erodedPenPath = d3.geoPath(pen, this.erodedCtx);
    this.reachPenPath = d3.geoPath(pen, this.reachCtx);
    this.inkPenPath = d3.geoPath(pen, this.inkCtx);
    this.measurePath = d3.geoPath(this.projection);
    this.graticule = d3.geoGraticule().step([15, 15]);
    this.sphere = { type: 'Sphere' };
    this._applyView();
  }

  _applyView() {
    const w = this.width, h = this.height;
    if (!w || !h) return;
    const v = this.view;
    const p = this.projection;
    // the fit below measures the whole sphere; the viewport clip goes back
    // on at the end
    p.clipExtent(null);
    if (this.mode === 'globe') {
      // the fitted globe nearly fills the short side of the viewport, which
      // on a phone in portrait is its width
      const R = (Math.min(w, h) / 2) * 0.94 * v.zoom;
      p.scale(R).translate([w / 2, h / 2]).rotate([-v.lon, -v.lat, 0]);
      this.R = R;
    } else {
      p.scale(1).translate([0, 0]);
      const b = this.measurePath.bounds(this.sphere);
      const mapW = b[1][0] - b[0][0], mapH = b[1][1] - b[0][1];
      const k = Math.min(w / mapW, h / mapH) * 0.98 * v.zoom;
      p.scale(k);
      const c = p([v.lon, v.lat]) || [0, 0];
      let tx = w / 2 - c[0], ty = h / 2 - c[1];
      // do not let the map drift off and leave a bare canvas behind it:
      // centre it while it is smaller than the viewport, otherwise keep its
      // edges outside
      const bw = mapW * k, bh = mapH * k;
      const cx = -(b[0][0] + b[1][0]) / 2 * k, cy = -(b[0][1] + b[1][1]) / 2 * k;
      if (bw <= w) tx = w / 2 + cx;
      else tx = Math.min(cx + bw / 2, Math.max(w - bw / 2 + cx, tx));
      if (bh <= h) ty = h / 2 + cy;
      else ty = Math.min(cy + bh / 2, Math.max(h - bh / 2 + cy, ty));
      p.translate([tx, ty]);
      const back = p.invert([w / 2, h / 2]);
      if (back && !Number.isNaN(back[0])) { v.lon = wrapLon(back[0]); v.lat = clampLat(back[1]); }
      this.R = k;
      this._flatArea = this.measurePath.area(this.sphere);
    }
    // the coast reach in pixels at this scale (the projection's scale is
    // pixels per Earth radius on the globe, and near enough on the flat map)
    this._reach = REACH_KM * p.scale() / 6371;
    // only what is on screen is resampled and drawn, whatever the zoom; the
    // margin keeps strokes at the edge whole, the reach included
    const m = Math.max(40, Math.ceil(this._reach) + 8);
    p.clipExtent([[-m, -m], [w + m, h + m]]);
    this._window = this._visibleWindow();
    this.baseDirty = true;
    if (v.zoom >= HI_ZOOM && !this.landHi && !this._askedHi && this.onNeedLandHi) {
      this._askedHi = true;
      this.onNeedLandHi();
    }
  }

  // The lon/lat window the viewport shows, once the zoom is deep enough for
  // culling to pay: the corners and edge midpoints inverted, with a margin.
  // Null at world scale, when a corner is off the globe, or when the window
  // would cross the antimeridian, so everything draws as before.
  _visibleWindow() {
    const v = this.view, w = this.width, h = this.height;
    if (v.zoom < CULL_ZOOM) return null;
    let lon0 = Infinity, lon1 = -Infinity, lat0 = Infinity, lat1 = -Infinity;
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h], [w / 2, 0], [w / 2, h], [0, h / 2], [w, h / 2], [w / 2, h / 2]]) {
      const ll = this.projection.invert([x, y]);
      if (!ll || Number.isNaN(ll[0]) || Number.isNaN(ll[1])) return null;
      lon0 = Math.min(lon0, ll[0]); lon1 = Math.max(lon1, ll[0]);
      lat0 = Math.min(lat0, ll[1]); lat1 = Math.max(lat1, ll[1]);
    }
    if (lon1 - lon0 > 180 || lat1 - lat0 > 90) return null;
    const ml = (lon1 - lon0) * 0.15 + 0.2, mt = (lat1 - lat0) * 0.15 + 0.2;
    return { lon0: lon0 - ml, lon1: lon1 + ml, lat0: lat0 - mt, lat1: lat1 + mt };
  }

  // whether a feature's bounding box touches the window; a box that crosses
  // the antimeridine is always drawn
  _inWindow(f) {
    const win = this._window;
    if (!win) return true;
    if (!f._bbox) f._bbox = d3.geoBounds(f);
    const [[x0, y0], [x1, y1]] = f._bbox;
    if (x0 > x1) return true;
    return x1 >= win.lon0 && x0 <= win.lon1 && y1 >= win.lat0 && y0 <= win.lat1;
  }

  // a base layer as a list of features with bounding boxes, split once so
  // the land's many polygons can be culled one by one
  _parts(layer) {
    if (!layer) return null;
    if (!this._partsOf) this._partsOf = new WeakMap();
    let parts = this._partsOf.get(layer);
    if (parts) return parts;
    parts = [];
    const push = (geometry) => {
      if (!geometry) return;
      if (geometry.type === 'MultiPolygon') for (const c of geometry.coordinates) parts.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: c } });
      else if (geometry.type === 'MultiLineString') for (const c of geometry.coordinates) parts.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: c } });
      else if (geometry.type === 'GeometryCollection') geometry.geometries.forEach(push);
      else parts.push({ type: 'Feature', geometry });
    };
    if (layer.type === 'FeatureCollection') for (const f of layer.features) push(f.geometry);
    else if (layer.type === 'Feature') push(layer.geometry);
    else push(layer);
    for (const f of parts) f._bbox = d3.geoBounds(f);
    this._partsOf.set(layer, parts);
    return parts;
  }

  // the part of a base layer worth streaming for this view
  _visible(layer) {
    if (!this._window) return layer;
    const parts = this._parts(layer);
    if (!parts) return layer;
    return { type: 'FeatureCollection', features: parts.filter((f) => this._inWindow(f)) };
  }

  resize() {
    const host = this.canvas.parentElement || this.canvas;
    const rect = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
    // three device pixels per CSS pixel triples the fill work for no visible
    // gain on a map; two is plenty
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w === this.width && h === this.height && dpr === this.dpr) return;
    this.width = w; this.height = h; this.dpr = dpr;
    for (const c of [this.canvas, this.baseCanvas, this.maskCanvas, this.washCanvas, this.erodedCanvas, this.reachCanvas, this.inkCanvas]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this._applyView();
    this.render();
  }

  _emitView() {
    if (this.onViewChange) this.onViewChange(this.getView());
  }

  // ---- drawing --------------------------------------------------------

  render() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this.draw(); });
  }

  draw() {
    const ctx = this.ctx, w = this.width, h = this.height;
    if (!w || !h) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (this.baseDirty) this._drawBase();
    ctx.drawImage(this.baseCanvas, 0, 0, w, h);
    this._drawWashes();
    if (this.labels) this._drawLabels(ctx);
    if (this.mode === 'globe') this._drawRim(ctx);
    if (this.skin === 'scifi') this._drawLock(ctx);
  }

  _drawBase() {
    const ctx = this.baseCtx, w = this.width, h = this.height, path = this.basePath, pen = this.basePenPath;
    const S = this.S, ink = (a) => inkOf(S, a);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // in the atlas skin, a soft shadow under the disc, a little to the lower
    // right, so the globe sits on the page's paper rather than in it
    if (this.mode === 'globe' && this.skin === 'atlas') {
      const R = this.R, cx = w / 2 + R * 0.02, cy = h / 2 + R * 0.035;
      const sh = ctx.createRadialGradient(cx, cy, R * 0.94, cx, cy, R * 1.07);
      sh.addColorStop(0, ink(0.26));
      sh.addColorStop(1, ink(0));
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.07, 0, Math.PI * 2);
      ctx.fillStyle = sh;
      ctx.fill();
    }
    // the sea, lit from the upper left so the disc reads as a sphere
    ctx.beginPath();
    path(this.sphere);
    if (this.mode === 'globe') {
      const R = this.R, cx = w / 2, cy = h / 2;
      const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R);
      g.addColorStop(0, S.seaInner);
      g.addColorStop(1, S.seaOuter);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = S.flatSea;
    }
    ctx.fill();
    // the grain of the paper, kept to the sheet
    if (S.grain) {
      ctx.save();
      ctx.clip();
      if (!this._grain) this._grain = makeGrain();
      ctx.fillStyle = ctx.createPattern(this._grain, 'repeat');
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    ctx.beginPath();
    path(this.graticule());
    ctx.lineWidth = 1;
    ctx.strokeStyle = ink(S.graticule);
    ctx.stroke();

    if (this.skin === 'atlas') this._drawSeas(ctx);

    const mask = this.maskCtx, er = this.erodedCtx;
    mask.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    mask.clearRect(0, 0, w, h);
    er.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    er.clearRect(0, 0, w, h);

    if (this.base) {
      const land = this._visible(this.landHi && this.view.zoom >= HI_ZOOM ? this.landHi : this.base.land);
      ctx.beginPath();
      pen(land);
      // water lining: a few widening strokes along the coast, the landward
      // half of each then covered by the land. On paper it is thin ink, the
      // sea darkening at the shore the way a pen hatches it; on the dark
      // globe it is a cold light the coast gives off.
      ctx.lineJoin = 'round';
      for (const [width, alpha] of [[9, 0.05], [5, 0.09], [2.4, 0.16]]) {
        ctx.lineWidth = width;
        ctx.strokeStyle = `${S.lining}${alpha})`;
        ctx.stroke();
      }
      ctx.fillStyle = S.land;
      ctx.fill();
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = ink(S.edge);
      ctx.stroke();

      mask.beginPath();
      this.maskPenPath(land);
      mask.fillStyle = '#fff';
      mask.fill();

      const lakes = this.base.lakes ? this._visible(this.base.lakes) : null;
      if (lakes) {
        ctx.beginPath();
        pen(lakes);
        ctx.fillStyle = S.lake;
        ctx.fill();
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = ink(S.edge * 0.7);
        ctx.stroke();
        mask.beginPath();
        this.maskPenPath(lakes);
        mask.globalCompositeOperation = 'destination-out';
        mask.fill();
        mask.globalCompositeOperation = 'source-over';
      }
      // the land shrunk by the reach (REACH_KM): the polity ink is drawn
      // only inside it, since that close to the water the coast is the border
      er.setTransform(1, 0, 0, 1, 0, 0);
      er.drawImage(this.maskCanvas, 0, 0);
      er.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (this._reach > 0.3) {
        er.globalCompositeOperation = 'destination-out';
        er.lineWidth = this._reach * 2;
        er.lineJoin = 'round';
        er.beginPath();
        this.erodedPenPath(land);
        if (lakes) this.erodedPenPath(lakes);
        er.stroke();
        er.globalCompositeOperation = 'source-over';
      }
      const rivers = this.view.zoom < 1.8 && this.base.riversMajor ? this.base.riversMajor : this.base.rivers;
      if (rivers) {
        ctx.beginPath();
        pen(this._visible(rivers));
        ctx.lineWidth = Math.min(1.6, 0.55 + 0.18 * this.view.zoom);
        ctx.strokeStyle = S.river;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }

    if (this.mode === 'flat') {
      ctx.beginPath();
      path(this.sphere);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = this.skin === 'atlas' ? ink(0.85) : S.ring;
      ctx.stroke();
    }
    this.baseDirty = false;
  }

  // the names of the seas, in spaced italic capitals at a whisper, where an
  // engraved chart puts them; only where the point faces the viewer
  _drawSeas(ctx) {
    const v = this.view, w = this.width, h = this.height;
    const fs = Math.round(Math.min(24, 12 + v.zoom * 2.5));
    ctx.font = labelFont(fs, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = inkOf(this.S, 0.3);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.3em';
    for (const [name, lon, lat] of SEAS) {
      if (this.mode === 'globe' && d3.geoDistance([lon, lat], [v.lon, v.lat]) > Math.PI / 2 - 0.2) continue;
      const pt = this.projection([lon, lat]);
      if (!pt || Number.isNaN(pt[0]) || pt[0] < 0 || pt[0] > w || pt[1] < 0 || pt[1] > h) continue;
      ctx.fillText(name.toUpperCase(), pt[0], pt[1]);
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  // The washes go on a layer of their own, which the land mask then cuts at
  // the coast (a hand colouring a chart stops at the shore, and a rough
  // source polygon that runs into the sea leaves the sea clear), and the
  // layer is multiplied onto the paper so the grain and the ink show
  // through as they do under watercolour.
  // The polities go on in three layers. The washes: every polity's fill,
  // then each state's reach (REACH_KM past its edge, only where nothing is
  // painted, so a shape that stops short of the coast fills to it and its
  // neighbours are untouched), the whole cut at the coast by the land mask
  // (a hand colouring a chart stops at the shore, and a rough source
  // polygon that runs into the sea leaves the sea clear). The ink: every
  // polity's border, cut by the land shrunk by the reach, so a border is
  // drawn only inland and the coastline, already inked, is the border at
  // the shore. On paper the washes are multiplied onto the sheet so the
  // grain and the ink show through.
  _drawWashes() {
    const w = this.width, h = this.height;
    const wash = this.washCtx, ink = this.inkCtx;
    for (const c of [wash, ink]) {
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      c.lineJoin = 'round';
    }
    this._drawPolities(wash);
    this._drawReach();
    this._drawInk(ink);
    wash.setTransform(1, 0, 0, 1, 0, 0);
    ink.setTransform(1, 0, 0, 1, 0, 0);
    if (this.base) {
      wash.globalCompositeOperation = 'destination-in';
      wash.drawImage(this.maskCanvas, 0, 0);
      wash.globalCompositeOperation = 'source-over';
      ink.globalCompositeOperation = 'destination-in';
      ink.drawImage(this.erodedCanvas, 0, 0);
      ink.globalCompositeOperation = 'source-over';
    }
    const out = this.ctx;
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.globalCompositeOperation = this.S.blend;
    out.drawImage(this.washCanvas, 0, 0);
    out.globalCompositeOperation = 'source-over';
    out.drawImage(this.inkCanvas, 0, 0);
    out.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // every polity's wash in order, the selected one last so it sits on top
  _drawPolities(ctx) {
    const path = this.washPenPath;
    const selected = [];
    for (const f of this.polities) {
      if (f._civ.id === this.selectedId) { selected.push(f); continue; }
      if (this._window && !this._inWindow(f)) continue;
      this._drawPolity(ctx, path, f, false);
    }
    for (const f of selected) this._drawPolity(ctx, path, f, true);
  }

  // the reach: a wide stroke of each state's own wash colour along its
  // edge, with every polity's interior then cut out, so only the outward
  // half is left; it goes behind the washes
  _drawReach() {
    const reach = this._reach;
    if (!(reach > 0.3) || !this.polities.length) return;
    const ctx = this.reachCtx, path = this.reachPenPath, w = this.width, h = this.height;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    ctx.lineWidth = reach * 2;
    const shown = this.polities.filter((f) => !this._window || this._inWindow(f));
    for (const f of shown) {
      if (f._civ.kind === 'culture') continue;
      ctx.beginPath();
      path(f);
      ctx.strokeStyle = this._washColor(f, f._civ.id === this.selectedId);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    for (const f of shown) { ctx.beginPath(); path(f); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    const wash = this.washCtx;
    wash.setTransform(1, 0, 0, 1, 0, 0);
    wash.globalCompositeOperation = 'destination-over';
    wash.drawImage(this.reachCanvas, 0, 0);
    wash.globalCompositeOperation = 'source-over';
    wash.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // every polity's border in order, the selected one last
  _drawInk(ctx) {
    const path = this.inkPenPath;
    const selected = [];
    for (const f of this.polities) {
      if (f._civ.id === this.selectedId) { selected.push(f); continue; }
      if (this._window && !this._inWindow(f)) continue;
      this._drawPolityInk(ctx, path, f, false);
    }
    for (const f of selected) this._drawPolityInk(ctx, path, f, true);
  }

  // a people's range is a faint see-through wash; a state is a solid wash
  // of a lightened colour on paper, so where two source polygons overlap
  // the smaller, drawn later, simply covers the larger, as one colour laid
  // over another on a chart would (Amy saw the Tang and Tibet mixing where
  // the 700 map runs them into each other); on the dark globe a state is a
  // translucent pane
  _washColor(f, isSelected) {
    const color = f._civ.color, culture = f._civ.kind === 'culture';
    if (this.skin === 'scifi') return withAlpha(color, isSelected ? 0.7 : culture ? 0.2 : 0.55);
    return culture ? withAlpha(color, 0.18) : tint(color, isSelected ? 0.4 : 0.52);
  }

  _drawPolity(ctx, path, f, isSelected) {
    ctx.beginPath();
    path(f);
    ctx.fillStyle = this._washColor(f, isSelected);
    ctx.fill();
    // on paper the paint pools a little along a state's edge
    if (this.skin === 'atlas' && f._civ.kind !== 'culture') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = withAlpha(tint(f._civ.color, 0.2), 0.7);
      ctx.stroke();
    }
  }

  // the border: an approximate one (precision 1) is drawn lighter than one
  // fixed by treaty or survey, so the map never claims more certainty than
  // its sources have; on the dark globe it is a lit edge in the polity's
  // own colour, on paper it is ink
  _drawPolityInk(ctx, path, f, isSelected) {
    const color = f._civ.color;
    const culture = f._civ.kind === 'culture';
    const precision = f.properties.precision || 1;
    const S = this.S;
    ctx.beginPath();
    path(f);
    if (isSelected) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = this.skin === 'scifi' ? 14 : 12;
      ctx.lineWidth = this.skin === 'scifi' ? 2.2 : 2;
      ctx.strokeStyle = S.select;
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (this.skin === 'scifi') {
      if (culture) { ctx.lineWidth = 0.8; ctx.strokeStyle = withAlpha(color, 0.35); }
      else { ctx.lineWidth = precision >= 3 ? 1.6 : precision === 2 ? 1.3 : 1; ctx.strokeStyle = withAlpha(color, precision >= 3 ? 0.9 : precision === 2 ? 0.75 : 0.6); }
      ctx.stroke();
      return;
    }
    const ink = (a) => inkOf(S, a);
    if (culture) { ctx.lineWidth = 0.7; ctx.strokeStyle = ink(0.22); }
    else { ctx.lineWidth = precision >= 2 ? 1 : 0.9; ctx.strokeStyle = ink(precision >= 3 ? 0.8 : precision === 2 ? 0.65 : 0.45); }
    ctx.stroke();
  }

  _textWidth(ctx, text, font) {
    const key = font + '|' + text;
    let w = this._textWidths.get(key);
    if (w == null) {
      ctx.font = font;
      w = ctx.measureText(text).width;
      this._textWidths.set(key, w);
    }
    return w;
  }

  // Labels sit on the polity centroid when the polity is big enough on screen
  // for its name, and never on top of each other. On-screen size comes from
  // the spherical area scaled to pixels (foreshortened by the angle from the
  // view centre on the globe), which is far cheaper than measuring the drawn
  // path and accurate enough to decide whether a word fits. Amy wanted the
  // names shown more readily, so a name may run a good way past its polity,
  // and one that will not fit at its size tries the smallest legible size
  // before giving up.
  _drawLabels(ctx) {
    const w = this.width, h = this.height, v = this.view;
    const base = Math.min(15, 11 + v.zoom * 0.8);
    const placed = [];
    const centre = [v.lon, v.lat];
    const pxPerSr = this.mode === 'globe' ? this.R * this.R : this._flatArea / (4 * Math.PI);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    // selected first so it always gets its label, then states before
    // peoples (a people's range often rings a state, and its centroid can
    // land inside the hole where the state sits: the state's name goes
    // there), largest first within each
    const rank = (f) => (f._civ.id === this.selectedId ? 2 : f._civ.kind === 'culture' ? 0 : 1);
    const order = this.polities.slice().sort((a, b) => rank(b) - rank(a) || b._area - a._area);

    for (const f of order) {
      if (this._window && !this._inWindow(f)) continue;
      let pt, side;
      if (this._window) {
        // zoomed in, the name goes on the centroid of the part on screen,
        // sized by that part, from the clipped projection: a polity that
        // fills the view with its centroid beyond it still carries its name
        const a = this.measurePath.area(f);
        if (!(a > 0)) continue;
        pt = this.measurePath.centroid(f);
        if (!pt || Number.isNaN(pt[0])) continue;
        side = Math.sqrt(a);
      } else {
        const c = f._centroid;
        let cosd = 1;
        if (this.mode === 'globe') {
          const d = d3.geoDistance(c, centre);
          if (d > Math.PI / 2 - 0.08) continue;
          cosd = Math.cos(d);
        }
        pt = this.projection(c);
        if (!pt || Number.isNaN(pt[0])) continue;
        if (pt[0] < -20 || pt[0] > w + 20 || pt[1] < -20 || pt[1] > h + 20) continue;
        side = Math.sqrt(Math.max(0, f._area * pxPerSr * cosd));
      }
      const isSel = f._civ.id === this.selectedId;
      const culture = f._civ.kind === 'culture';
      const name = (f.properties.label || f._civ.name).toUpperCase();
      // spaced capitals; the measured widths are cached by font, and the
      // font says which spacing was in force
      if ('letterSpacing' in ctx) ctx.letterSpacing = culture ? LABEL_SPACING.culture : LABEL_SPACING.state;
      // an empire's name is lettered a little larger than a city state's;
      // a people's name is context, not a border, so it needs more room
      const big = Math.round(base * Math.min(1.35, Math.max(1, side / 180)));
      const small = Math.max(9, Math.round(base) - 3);
      const room = isSel ? Infinity : side * (culture ? 1.05 : 1.7);
      const fit = this._fitName(ctx, name, big, side, room, culture) || (big > small && this._fitName(ctx, name, small, side, room, culture));
      if (!fit) continue;
      const { lines, width, fs, font } = fit;
      const lh = fs * 1.1;
      // zoomed in, a name near the edge is kept whole on screen
      if (this._window) {
        pt[0] = Math.max(width / 2 + 6, Math.min(w - width / 2 - 6, pt[0]));
        pt[1] = Math.max((lh * lines.length) / 2 + 6, Math.min(h - (lh * lines.length) / 2 - 6, pt[1]));
      }
      const box = { x0: pt[0] - width / 2 - 3, x1: pt[0] + width / 2 + 3, y0: pt[1] - (lh * lines.length) / 2 - 2, y1: pt[1] + (lh * lines.length) / 2 + 2 };
      if (placed.some((b) => b.x0 < box.x1 && b.x1 > box.x0 && b.y0 < box.y1 && b.y1 > box.y0)) continue;
      placed.push(box);
      ctx.font = font;
      ctx.lineWidth = 3;
      ctx.strokeStyle = this.S.halo;
      ctx.fillStyle = isSel ? this.S.selectedLabel : culture ? this.S.people : this.S.label;
      lines.forEach((line, i) => {
        const y = pt[1] + (i - (lines.length - 1) / 2) * lh;
        ctx.strokeText(line, pt[0], y);
        ctx.fillText(line, pt[0], y);
      });
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  // the name at one size: on one line, or two when it is wider than its
  // polity and breaks well at a word; null when it is still wider than the
  // room it has
  _fitName(ctx, name, fs, side, room, culture) {
    const font = labelFont(fs, culture);
    let lines = [name];
    let width = this._textWidth(ctx, name, font);
    if (width > side * 1.15 && name.includes(' ')) {
      const words = name.split(' ');
      let best = 1, bestDiff = Infinity;
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
        const diff = Math.abs(this._textWidth(ctx, a, font) - this._textWidth(ctx, b, font));
        if (diff < bestDiff) { bestDiff = diff; best = i; }
      }
      lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
      width = Math.max(...lines.map((l) => this._textWidth(ctx, l, font)));
    }
    if (width > room) return null;
    return { lines, width, fs, font };
  }

  _drawRim(ctx) {
    const R = this.R, cx = this.width / 2, cy = this.height / 2;
    const S = this.S, atlas = this.skin === 'atlas';
    // the sci-fi skin has a soft blue haze just outside the disc
    if (!atlas) {
      const g = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 1.07);
      g.addColorStop(0, S.glow);
      g.addColorStop(1, 'rgba(120,170,240,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.07, 0, Math.PI * 2);
      ctx.arc(cx, cy, R, 0, Math.PI * 2, true);
      ctx.fillStyle = g;
      ctx.fill();
    }
    // the limb, and a thin ring a little outside it, the meridian ring of
    // a desk globe
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = atlas ? inkOf(S, 0.85) : 'rgba(170,205,255,.5)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, R + 3.5, 0, Math.PI * 2);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = atlas ? inkOf(S, 0.3) : S.ring;
    ctx.stroke();
  }

  // The lock-on, the sci-fi skin's own instrument: when a polity is chosen,
  // four HUD brackets converge on it from outside and hold its bounds as
  // the globe turns, a scan sweeps once across it, and a leader runs from
  // the nearest bracket to the card, wherever the card has been put, so the
  // card is tied to the land it describes. Reduced motion lands the
  // brackets at once and skips the sweep.
  _drawLock(ctx) {
    const id = this.selectedId;
    if (!id) { this._lockId = null; return; }
    const feats = this.polities.filter((f) => f._civ.id === id);
    if (!feats.length) return;
    const b = this.measurePath.bounds({ type: 'FeatureCollection', features: feats });
    if (!b || !Number.isFinite(b[0][0]) || !Number.isFinite(b[1][0]) || b[1][0] <= b[0][0]) return;
    const now = performance.now();
    if (this._lockId !== id) { this._lockId = id; this._lockT0 = now; }
    const age = now - this._lockT0;
    const u = this._reduced ? 1 : Math.min(1, age / 420);
    const k = 1 - Math.pow(1 - u, 3);
    const spread = 6 + 40 * (1 - k);
    const w = this.width, h = this.height;
    const x0 = Math.max(-40, b[0][0]) - spread, y0 = Math.max(-40, b[0][1]) - spread;
    const x1 = Math.min(w + 40, b[1][0]) + spread, y1 = Math.min(h + 40, b[1][1]) + spread;
    const L = Math.max(8, Math.min(22, Math.min(x1 - x0, y1 - y0) * 0.25));
    const hud = `rgba(${this.S.hud},`;
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = `${hud}${0.95 * k})`;
    ctx.shadowColor = `${hud}0.8)`;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
      ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    // the sweep: one line down the polity, kept to its shape
    if (!this._reduced && age < 700) {
      const t = age / 700;
      ctx.save();
      ctx.beginPath();
      for (const f of feats) this.path(f);
      ctx.clip();
      const y = b[0][1] + (b[1][1] - b[0][1]) * t;
      ctx.beginPath();
      ctx.moveTo(b[0][0], y); ctx.lineTo(b[1][0], y);
      ctx.lineWidth = 2;
      ctx.strokeStyle = `${hud}${0.85 * (1 - t)})`;
      ctx.stroke();
      ctx.restore();
    }
    // the leader: from the bracket corner nearest the card to the card's
    // nearest edge, unless the card sits over the polity
    const r = this._cardRect;
    if (r && k > 0.6) {
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const px = Math.max(r.x, Math.min(r.x + r.w, cx)), py = Math.max(r.y, Math.min(r.y + r.h, cy));
      const inside = px > x0 && px < x1 && py > y0 && py < y1;
      if (!inside) {
        let best = null, bd = Infinity;
        for (const c of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
          const d = Math.hypot(c[0] - px, c[1] - py);
          if (d < bd) { bd = d; best = c; }
        }
        const a = Math.min(1, (k - 0.6) / 0.4) * 0.6;
        ctx.strokeStyle = `${hud}${a})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(best[0], best[1]); ctx.lineTo(px, py);
        ctx.stroke();
        ctx.fillStyle = `${hud}${a * 1.4})`;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    if (!this._reduced && age < 700) this.render();
  }

  // ---- picking --------------------------------------------------------

  // the polity under a canvas point, smallest first so an enclave wins over
  // the empire around it; null on ocean, on empty land, or off the globe
  hitTest(x, y) {
    if (this.mode === 'globe') {
      const dx = x - this.width / 2, dy = y - this.height / 2;
      if (dx * dx + dy * dy > this.R * this.R) return null;
    }
    const ll = this.projection.invert([x, y]);
    if (!ll || Number.isNaN(ll[0]) || Number.isNaN(ll[1])) return null;
    for (let i = this.polities.length - 1; i >= 0; i--) {
      const f = this.polities[i];
      if (d3.geoContains(f, ll)) return f;
    }
    return null;
  }

  // ---- gestures -------------------------------------------------------

  _bindGestures() {
    const c = this.canvas;
    c.style.touchAction = 'none';
    c.style.cursor = 'grab';

    c.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      c.setPointerCapture(e.pointerId);
      this._stopAnim();
      const pt = this._local(e);
      this._pointers.set(e.pointerId, { ...pt, x0: pt.x, y0: pt.y, t0: performance.now() });
      this._moved = this._pointers.size > 1;
      if (this._pointers.size === 2) this._startPinch();
      c.style.cursor = 'grabbing';
    });

    c.addEventListener('pointermove', (e) => {
      const p = this._pointers.get(e.pointerId);
      if (!p) return;
      const pt = this._local(e);
      const dx = pt.x - p.x, dy = pt.y - p.y;
      p.x = pt.x; p.y = pt.y;
      if (this._pointers.size === 1) {
        if (!this._moved && Math.hypot(pt.x - p.x0, pt.y - p.y0) > 6) this._moved = true;
        if (this._moved) this._panBy(dx, dy);
      } else if (this._pointers.size === 2) {
        this._moved = true;
        this._updatePinch();
      }
    });

    const up = (e) => {
      const p = this._pointers.get(e.pointerId);
      if (!p) return;
      this._pointers.delete(e.pointerId);
      if (this._pointers.size === 0) {
        c.style.cursor = 'grab';
        const quick = performance.now() - p.t0 < 600;
        if (!this._moved && quick && e.type === 'pointerup' && this.onTap) {
          const pt = this._local(e);
          this.onTap(this.hitTest(pt.x, pt.y), pt.x, pt.y);
        }
        this._emitView();
      } else {
        // a pinch ended with one finger still down: that finger may drag on,
        // but lifting it is not a tap
        this._moved = true;
        this._pinch = null;
      }
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const pt = this._local(e);
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0016));
      this._zoomAt(pt.x, pt.y, this.view.zoom * factor);
      this._emitViewSoon();
    }, { passive: false });
  }

  _local(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _startPinch() {
    const [a, b] = [...this._pointers.values()];
    this._pinch = {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      zoom: this.view.zoom,
    };
  }

  _updatePinch() {
    if (!this._pinch) return this._startPinch();
    const [a, b] = [...this._pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const zoom = this._pinch.zoom * (dist / Math.max(1, this._pinch.dist));
    this._panBy(mid.x - this._pinch.mid.x, mid.y - this._pinch.mid.y, { silent: true });
    this._pinch.mid = mid;
    this._zoomAt(mid.x, mid.y, zoom);
  }

  // drag the world by a screen offset: on the globe a pixel is an angle at
  // the current radius; on the flat map the new centre is whatever geographic
  // point now sits under the middle of the screen
  _panBy(dx, dy, { silent = false } = {}) {
    const v = this.view;
    if (this.mode === 'globe') {
      const degPerPx = 180 / (Math.PI * this.R);
      v.lon = wrapLon(v.lon - dx * degPerPx);
      v.lat = clampLat(v.lat + dy * degPerPx);
    } else {
      const ll = this.projection.invert([this.width / 2 - dx, this.height / 2 - dy]);
      if (ll && !Number.isNaN(ll[0])) { v.lon = wrapLon(ll[0]); v.lat = clampLat(ll[1]); }
    }
    this._applyView();
    this.render();
    if (!silent) this._emitViewSoon();
  }

  // zoom while keeping the point under the finger where it is
  _zoomAt(x, y, zoom) {
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    const before = this.projection.invert([x, y]);
    this.view.zoom = zoom;
    this._applyView();
    if (before && !Number.isNaN(before[0])) {
      const after = this.projection(before);
      if (after && !Number.isNaN(after[0])) this._panBy(x - after[0], y - after[1], { silent: true });
    }
    this.render();
  }

  _emitViewSoon() {
    clearTimeout(this._emitTimer);
    this._emitTimer = setTimeout(() => this._emitView(), 120);
  }
}

export { HI_ZOOM, MIN_ZOOM, MAX_ZOOM };
