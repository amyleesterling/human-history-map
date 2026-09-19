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

import { withAlpha } from './palette.js';

const d3 = globalThis.d3;

const STYLE = {
  oceanInner: '#1c3752', oceanOuter: '#0a1729',
  flatOcean: '#0f2136',
  land: '#2f333a', landEdge: 'rgba(210,220,235,.16)',
  lake: '#153052', river: 'rgba(120,170,220,.55)',
  graticule: 'rgba(255,255,255,.055)',
  rim: 'rgba(170,205,255,.45)', glow: 'rgba(120,170,240,.22)',
  label: '#f5f1e8', halo: 'rgba(8,10,14,.75)',
  select: '#ffffff',
};

// zoom (relative to the fitted globe) past which the 1:50m coastline is worth
// its download, and the zoom range gestures are allowed
const HI_ZOOM = 2.6;
const MIN_ZOOM = 1;
const MAX_ZOOM = 16;

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
    this.mode = opts.mode === 'flat' ? 'flat' : 'globe';
    this.view = { lon: 30, lat: 25, zoom: 1, ...(opts.view || {}) };
    this.polities = [];
    this.selectedId = null;
    this.base = null;
    this.landHi = null;
    this.width = 0; this.height = 0; this.dpr = 1;
    this.baseCanvas = document.createElement('canvas');
    this.baseCtx = this.baseCanvas.getContext('2d');
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
    const target = { lon: c[0], lat: c[1], zoom: zoom ?? Math.min(this.fitZoomFor(list), 6) };
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
    this.baseDirty = true;
    if (v.zoom >= HI_ZOOM && !this.landHi && !this._askedHi && this.onNeedLandHi) {
      this._askedHi = true;
      this.onNeedLandHi();
    }
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
    for (const c of [this.canvas, this.baseCanvas]) {
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
    this._drawPolities(ctx);
    if (this.labels) this._drawLabels(ctx);
    if (this.mode === 'globe') this._drawRim(ctx);
  }

  _drawBase() {
    const ctx = this.baseCtx, w = this.width, h = this.height, path = this.basePath;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // the ocean, lit from the upper left so the disc reads as a sphere
    ctx.beginPath();
    path(this.sphere);
    if (this.mode === 'globe') {
      const R = this.R, cx = w / 2, cy = h / 2;
      const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R);
      g.addColorStop(0, STYLE.oceanInner);
      g.addColorStop(1, STYLE.oceanOuter);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = STYLE.flatOcean;
    }
    ctx.fill();

    ctx.beginPath();
    path(this.graticule());
    ctx.lineWidth = 1;
    ctx.strokeStyle = STYLE.graticule;
    ctx.stroke();

    if (this.base) {
      const land = this.landHi && this.view.zoom >= HI_ZOOM ? this.landHi : this.base.land;
      ctx.beginPath();
      path(land);
      ctx.fillStyle = STYLE.land;
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = STYLE.landEdge;
      ctx.stroke();

      if (this.base.lakes) {
        ctx.beginPath();
        path(this.base.lakes);
        ctx.fillStyle = STYLE.lake;
        ctx.fill();
      }
      const rivers = this.view.zoom < 1.8 && this.base.riversMajor ? this.base.riversMajor : this.base.rivers;
      if (rivers) {
        ctx.beginPath();
        path(rivers);
        ctx.lineWidth = Math.min(1.6, 0.55 + 0.18 * this.view.zoom);
        ctx.strokeStyle = STYLE.river;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }

    if (this.mode === 'flat') {
      ctx.beginPath();
      path(this.sphere);
      ctx.lineWidth = 1;
      ctx.strokeStyle = STYLE.rim;
      ctx.stroke();
    }
    this.baseDirty = false;
  }

  _drawPolities(ctx) {
    const path = this.path;
    let selected = null;
    ctx.lineJoin = 'round';
    for (const f of this.polities) {
      if (f._civ.id === this.selectedId) { selected = f; continue; }
      this._drawPolity(ctx, path, f, false);
    }
    if (selected) this._drawPolity(ctx, path, selected, true);
  }

  _drawPolity(ctx, path, f, isSelected) {
    const color = f._civ.color;
    const culture = f._civ.kind === 'culture';
    const precision = f.properties.precision || 1;
    ctx.beginPath();
    path(f);
    // a people's range is a wash, a state is a fill; an approximate border
    // (precision 1) is drawn lighter than one fixed by treaty or survey, so
    // the map never claims more certainty than its sources have
    ctx.fillStyle = withAlpha(color, isSelected ? 0.74 : culture ? 0.2 : 0.52);
    ctx.fill();
    if (isSelected) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = STYLE.select;
      ctx.stroke();
      ctx.restore();
    } else if (culture) {
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = withAlpha(color, 0.3);
      ctx.stroke();
    } else {
      ctx.lineWidth = precision >= 2 ? 1 : 0.9;
      ctx.strokeStyle = withAlpha(color, precision >= 3 ? 0.95 : precision === 2 ? 0.8 : 0.6);
      ctx.stroke();
    }
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
  // path and accurate enough to decide whether a word fits.
  _drawLabels(ctx) {
    const w = this.width, h = this.height, v = this.view;
    const fs = Math.round(Math.min(15, 11 + v.zoom * 0.8));
    const font = `600 ${fs}px "Segoe UI", system-ui, -apple-system, sans-serif`;
    const placed = [];
    const centre = [v.lon, v.lat];
    const pxPerSr = this.mode === 'globe' ? this.R * this.R : this._flatArea / (4 * Math.PI);
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.06em';

    // selected first so it always gets its label
    const order = this.polities.slice().sort((a, b) =>
      (b._civ.id === this.selectedId) - (a._civ.id === this.selectedId) || b._area - a._area);

    for (const f of order) {
      const c = f._centroid;
      let cosd = 1;
      if (this.mode === 'globe') {
        const d = d3.geoDistance(c, centre);
        if (d > Math.PI / 2 - 0.08) continue;
        cosd = Math.cos(d);
      }
      const pt = this.projection(c);
      if (!pt || Number.isNaN(pt[0])) continue;
      if (pt[0] < -20 || pt[0] > w + 20 || pt[1] < -20 || pt[1] > h + 20) continue;
      const side = Math.sqrt(Math.max(0, f._area * pxPerSr * cosd));
      const isSel = f._civ.id === this.selectedId;
      const culture = f._civ.kind === 'culture';
      const name = (f.properties.label || f._civ.name).toUpperCase();
      let lines = [name];
      let width = this._textWidth(ctx, name, font);
      if (width > side * 1.15 && name.includes(' ')) {
        // break a long name in two roughly at the middle word
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
      // a people's name only when there is plenty of room: it is context, not a border
      if (!isSel && width > side * (culture ? 0.7 : 1.3)) continue;
      const lh = fs * 1.15;
      const box = { x0: pt[0] - width / 2 - 3, x1: pt[0] + width / 2 + 3, y0: pt[1] - (lh * lines.length) / 2 - 2, y1: pt[1] + (lh * lines.length) / 2 + 2 };
      if (placed.some((b) => b.x0 < box.x1 && b.x1 > box.x0 && b.y0 < box.y1 && b.y1 > box.y0)) continue;
      placed.push(box);
      ctx.font = font;
      ctx.lineWidth = 3;
      ctx.strokeStyle = STYLE.halo;
      ctx.fillStyle = isSel ? '#ffffff' : culture ? 'rgba(245,241,232,.7)' : STYLE.label;
      lines.forEach((line, i) => {
        const y = pt[1] + (i - (lines.length - 1) / 2) * lh;
        ctx.strokeText(line, pt[0], y);
        ctx.fillText(line, pt[0], y);
      });
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  _drawRim(ctx) {
    const R = this.R, cx = this.width / 2, cy = this.height / 2;
    // a thin bright limb and a soft haze just outside it
    const g = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 1.07);
    g.addColorStop(0, STYLE.glow);
    g.addColorStop(1, 'rgba(120,170,240,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.07, 0, Math.PI * 2);
    ctx.arc(cx, cy, R, 0, Math.PI * 2, true);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = STYLE.rim;
    ctx.stroke();
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
