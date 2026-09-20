// The explorer page: loads the data, owns the clock, and wires the globe to
// the timeline, the tooltip, search, and the URL. Everything a visitor sees is
// a function of (year, view, selected polity), and all three live in the
// query string so any moment can be shared.

import { HistoryData } from './data.js?v=depth-1';
import { Globe } from './globe.js?v=depth-1';
import { TimeScale, formatYear, formatCivSpan, formatCivDuration, defaultTicks, yearToTick, tickToYear, normalizeYear, advanceYear } from './timeline.js?v=depth-1';

import { matchingPeriods } from './card-periods.js?v=depth-1';

const $ = (id) => document.getElementById(id);
const els = {
  stage: $('stage'), globe: $('globe'), loading: $('loading'), hint: $('hint'),
  notice: $('notice'), noticeText: $('noticeText'), noticeClose: $('noticeClose'),
  tip: $('tip'), tipClose: $('tipClose'), tipToggle: $('tipToggle'), tipLine: $('tipLine'), tipBody: $('tipBody'),
  tipSwatch: $('tipSwatch'), tipName: $('tipName'),
  tipSpan: $('tipSpan'), tipMeta: $('tipMeta'), tipSummary: $('tipSummary'), tipSource: $('tipSource'), tipMore: $('tipMore'), tipZoom: $('tipZoom'),
  playBtn: $('playBtn'), yearOut: $('yearOut'), eraOut: $('eraOut'), speedBtn: $('speedBtn'),
  slider: $('slider'), track: $('trackCanvas'),
  searchBtn: $('searchBtn'), search: $('search'), searchInput: $('searchInput'), searchResults: $('searchResults'),
  skinBtn: $('skinBtn'),
  viewBtn: $('viewBtn'), shareBtn: $('shareBtn'),
};

const SLIDER_MAX = 10000;
const state = {
  year: -3000, time: -3000, playing: false, speed: 25,
  selected: null, mode: 'globe', tipAnchor: null,
  // the chip opens into the full card only when asked, and stays the way
  // the visitor left it from one tap to the next
  tipOpen: false, tipPos: null,
};
let data, globe, scale, manifest, speeds, eras = [], ticks = [];
let rafId = 0, lastTick = 0, urlTimer = 0, navigationVersion = 0;

// ---- boot -------------------------------------------------------------

async function main() {
  data = new HistoryData();
  try {
    manifest = await data.load('data/manifest.json');
  } catch (e) {
    showHint(`Could not load the data: ${e.message}`);
    console.error(e);
    return;
  }
  const tl = manifest.timeline || {};
  scale = new TimeScale(tl.start ?? -3500, tl.end ?? new Date().getFullYear(), tl.anchors);
  speeds = tl.speeds || [5, 25, 100];
  state.speed = tl.defaultSpeed || speeds[Math.floor(speeds.length / 2)];
  eras = manifest.eras || [];
  ticks = tl.ticks || defaultTicks(scale.start, scale.end);

  const url = readURL();
  state.mode = url.view === 'flat' ? 'flat' : 'globe';
  const mv = manifest.view || {};
  const view = { lon: url.lon ?? mv.lon ?? 30, lat: url.lat ?? mv.lat ?? 25, zoom: url.zoom ?? mv.zoom ?? 1 };

  globe = new Globe(els.globe, {
    mode: state.mode, view, onTap, skin: SKIN,
    onViewChange: () => { queueURL(); if (state.tipAnchor) placeTip(); },
    onNeedLandHi: () => data.loadLandHi().then((l) => l && globe.setLandHi(l)),
  });
  syncViewButton();
  data.onChange = () => { refreshPolities(); updateLoading(); };
  bindControls();
  drawTrack();
  window.addEventListener('resize', drawTrack);

  setYear(scale.clamp(url.year ?? tl.initial ?? scale.start), { force: true });
  data.loadBase().then((b) => globe.setBase(b)).catch((e) => { console.error(e); showHint('The coastlines failed to load.'); });

  if (url.civ) jumpToCiv(url.civ, url.year);
  else if (url.play || tl.autoplay) play();
  writeURL();

  if (manifest.notice && !sessionStorage.getItem('hhm-notice')) {
    els.noticeText.textContent = manifest.notice;
    els.notice.hidden = false;
  }
}

// ---- the clock --------------------------------------------------------

function setYear(t, { force = false, fromSlider = false } = {}) {
  navigationVersion++;
  const yr = normalizeYear(t);
  state.time = yearToTick(yr);
  if (yr === state.year && !force) return;
  state.year = yr;
  const label = formatYear(yr);
  els.yearOut.value = label;
  els.yearOut.textContent = label;
  els.eraOut.textContent = eraFor(yr);
  if (!fromSlider) els.slider.value = Math.round(scale.toT(yr) * SLIDER_MAX);
  els.slider.setAttribute('aria-valuetext', label);
  refreshPolities();
  queueURL();
}

function eraFor(yr) {
  const e = eras.find((x) => x.from <= yr && yr < x.to);
  return e ? e.name : '';
}

function refreshPolities() {
  const yr = state.year;
  if (data.yearStatus(yr).state === 'error') {
    globe.setPolities([]);
    if (state.selected && !els.tip.hidden) { const civ = data.civ(state.selected); if (civ) syncTipTime(civ); }
    updateLoading(); return;
  }
  const ready = data.isYearReady(yr);
  if (!ready) {
    data.ensureYear(yr).then(() => { if (state.year === yr) refreshPolities(); });
  } else {
    data.ensureYear(yr);
  }
  const list = data.polities(yr);
  globe.setPolities(list);
  if (state.selected && !els.tip.hidden) {
    const civ = data.civ(state.selected);
    if (civ) syncTipTime(civ);
  }
  updateLoading();
  if (ready) {
    if (list.length === 0) {
      showHint(data.hasFilesFor(yr)
        ? `No borders recorded for ${formatYear(yr)} yet.`
        : `No border file covers ${formatYear(yr)} yet.`);
    } else {
      hideHint();
    }
  }
}

function updateLoading() {
  const failed = data.yearStatus(state.year).state === 'error';
  let retry = document.getElementById('retryMap');
  if (!retry) {
    retry = document.createElement('button'); retry.id = 'retryMap';
    retry.className = 'retry-map'; retry.textContent = 'Retry map loading';
    retry.hidden = true; els.stage.appendChild(retry);
    retry.addEventListener('click', async () => { await data.retryYear(state.year); refreshPolities(); });
  }
  retry.hidden = !failed;
  if (failed) { pause(); showHint(`Borders for ${formatYear(state.year)} could not load. Please retry.`); }
  els.loading.hidden = !(data.loadingCount() > 0 && !data.isYearReady(state.year));
}

function play() {
  if (state.playing) return;
  if (state.year >= scale.end) setYear(scale.start, { force: true });
  state.playing = true;
  state.time = yearToTick(state.year);
  els.playBtn.setAttribute('aria-pressed', 'true');
  els.playBtn.setAttribute('aria-label', 'Pause');
  closeTip();
  lastTick = performance.now();
  rafId = requestAnimationFrame(tick);
  queueURL();
}

function pause() {
  if (!state.playing) return;
  state.playing = false;
  els.playBtn.setAttribute('aria-pressed', 'false');
  els.playBtn.setAttribute('aria-label', 'Play');
  cancelAnimationFrame(rafId);
  queueURL();
}

function tick(now) {
  if (!state.playing) return;
  const dt = Math.min(0.1, (now - lastTick) / 1000);
  lastTick = now;
  // hold at a seam until the next file is in, instead of playing an empty world
  const next = state.time + state.speed * dt;
  const ahead = Math.min(scale.end, tickToYear(Math.round(next)));
  if (!data.isYearReady(ahead)) {
    if (data.yearStatus(ahead).state === 'error') {
      setYear(ahead); pause(); updateLoading(); return;
    }
    data.ensureYear(ahead);
    updateLoading();
    rafId = requestAnimationFrame(tick);
    return;
  }
  if (next >= yearToTick(scale.end)) {
    setYear(scale.end);
    pause();
    return;
  }
  setYear(tickToYear(Math.round(next)));
  state.time = next;
  rafId = requestAnimationFrame(tick);
}

// ---- controls ---------------------------------------------------------

function bindControls() {
  els.playBtn.addEventListener('click', () => (state.playing ? pause() : play()));

  els.speedBtn.textContent = `${state.speed} yr/s`;
  els.speedBtn.addEventListener('click', () => {
    const i = speeds.indexOf(state.speed);
    state.speed = speeds[(i + 1) % speeds.length];
    els.speedBtn.textContent = `${state.speed} yr/s`;
  });

  els.slider.max = SLIDER_MAX;
  els.slider.addEventListener('input', () => {
    const yr = Math.round(scale.toYear(els.slider.value / SLIDER_MAX));
    setYear(yr, { fromSlider: true });
  });

  els.viewBtn.addEventListener('click', () => {
    state.mode = state.mode === 'globe' ? 'flat' : 'globe';
    globe.setMode(state.mode);
    syncViewButton();
    if (state.tipAnchor) placeTip();
  });

  els.shareBtn.addEventListener('click', share);
  els.tipClose.addEventListener('click', () => { closeTip(); deselect(); });
  // The head opens the card, and on a wide screen it is also the handle: a
  // drag moves the card and pins it where it is dropped, so the next tap
  // opens it there rather than beside the finger. The phone sheet is pinned
  // by the stylesheet and never drags. The pointer is captured so the drag
  // survives leaving the card, and the click a browser fires after a drag
  // is ignored by a deadline rather than a flag, the way scifi-ui's rail
  // does it: a drag that ends off the head fires no click to consume a flag.
  let drag = null, clickDeadline = 0;
  const now = () => (window.performance ? performance.now() : Date.now());
  const sheet = () => matchMedia('(max-width: 640px)').matches;
  els.tipToggle.addEventListener('pointerdown', (e) => {
    if (sheet() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const r = els.tip.getBoundingClientRect(), st = els.stage.getBoundingClientRect();
    drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, ox: st.left, oy: st.top, x0: e.clientX, y0: e.clientY, moved: false };
    try { els.tipToggle.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
  });
  els.tipToggle.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 4) return;
    drag.moved = true;
    els.tip.classList.add('is-dragging');
    state.tipAnchor = null;
    moveTip(e.clientX - drag.ox - drag.dx, e.clientY - drag.oy - drag.dy);
    e.preventDefault();
  });
  const endDrag = (e) => {
    if (!drag || (e && e.pointerId !== undefined && e.pointerId !== drag.id)) return;
    try { els.tipToggle.releasePointerCapture(drag.id); } catch (err) { /* already released */ }
    els.tip.classList.remove('is-dragging');
    if (drag.moved) clickDeadline = now() + 300;
    drag = null;
  };
  els.tipToggle.addEventListener('pointerup', endDrag);
  els.tipToggle.addEventListener('pointercancel', endDrag);
  els.tipToggle.addEventListener('lostpointercapture', endDrag);
  els.tipToggle.addEventListener('click', () => { if (now() < clickDeadline) return; setTipOpen(!state.tipOpen); });
  window.addEventListener('resize', () => { if (!els.tip.hidden) placeTip(); });
  els.tipZoom.addEventListener('click', () => {
    if (!state.selected) return;
    const feats = data.featuresOf(state.selected, state.year);
    if (feats.length) { state.tipAnchor = null; globe.focusFeatures(feats); }
  });
  els.noticeClose.addEventListener('click', () => {
    els.notice.hidden = true;
    try { sessionStorage.setItem('hhm-notice', '1'); } catch (e) { /* private mode */ }
  });

  els.searchBtn.addEventListener('click', () => (els.search.hidden ? openSearch() : closeSearch()));
  els.searchInput.addEventListener('input', renderSearch);
  els.searchInput.addEventListener('keydown', (e) => {
    const items = [...els.searchResults.querySelectorAll('li[data-id]')];
    const cur = items.findIndex((li) => li.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      const n = e.key === 'ArrowDown' ? Math.min(items.length - 1, cur + 1) : Math.max(0, cur - 1);
      items.forEach((li, i) => li.setAttribute('aria-selected', i === n ? 'true' : 'false'));
      items[n].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      const pick = items[cur >= 0 ? cur : 0];
      if (pick) { closeSearch(); jumpToCiv(pick.dataset.id); }
    } else if (e.key === 'Escape') {
      closeSearch();
    }
  });
  els.searchResults.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (li) { closeSearch(); jumpToCiv(li.dataset.id); }
  });

  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) {
      if (e.key === 'Escape' && t === els.slider) { closeTip(); deselect(); }
      return;
    }
    if (e.key === ' ') { e.preventDefault(); state.playing ? pause() : play(); }
    else if (e.key === 'Escape') { if (!els.search.hidden) closeSearch(); else { closeTip(); deselect(); } }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const step = (e.shiftKey ? 10 : 1) * (e.key === 'ArrowRight' ? 1 : -1);
      setYear(scale.clamp(advanceYear(state.year, step)));
    } else if (e.key === '/' ) { e.preventDefault(); openSearch(); }
  });
}

function syncViewButton() {
  const flat = state.mode === 'flat';
  els.viewBtn.setAttribute('aria-pressed', String(flat));
  els.viewBtn.textContent = flat ? 'Globe' : 'Flat map';
}

// ---- the track under the slider ----------------------------------------
// era bands, a histogram of how many polities the index knows in each slice
// of the timeline (so the empty stretches are visibly empty), and tick years

// The skin: the default pages are the atlas, ink on paper; the generated
// scifi.html sets data-skin="scifi" on the root and everything drawn on a
// canvas or linked from here follows it.
const SKIN = typeof document !== 'undefined' && document.documentElement && document.documentElement.dataset.skin === 'scifi' ? 'scifi' : 'atlas';
// the track's paint in each skin: parchment on the dark instrument, or ink
// and Garamond figures on the sheet
const TRACK = SKIN === 'atlas' ? {
  bandA: 'rgba(35,41,58,.04)', bandB: 'rgba(35,41,58,.085)',
  eraFont: '600 9.5px "Cinzel", "Times New Roman", serif', era: 'rgba(35,41,58,.6)',
  density: 'rgba(47,79,127,.32)',
  tickFont: '11px "EB Garamond", Garamond, "Times New Roman", serif', tick: 'rgba(35,41,58,.42)', tickLabel: 'rgba(35,41,58,.75)',
} : {
  bandA: 'rgba(255,255,255,.035)', bandB: 'rgba(255,255,255,.07)',
  eraFont: '600 9.5px "Segoe UI", system-ui, sans-serif', era: 'rgba(236,231,220,.5)',
  density: 'rgba(127,178,230,.42)',
  tickFont: '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', tick: 'rgba(236,231,220,.35)', tickLabel: 'rgba(236,231,220,.6)',
};

function drawTrack() {
  const c = els.track, dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = c.getBoundingClientRect();
  const w = Math.round(rect.width), h = Math.round(rect.height);
  if (!w || !h) return;
  c.width = w * dpr; c.height = h * dpr;
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // the range input's thumb is 14px wide and the browser keeps its centre
  // inside [7, w-7], so the track is drawn on the same inset
  const pad = 7, tw = w - 2 * pad, bandH = 34;
  const X = (yr) => pad + scale.toT(yr) * tw;

  eras.forEach((e, i) => {
    const x0 = X(Math.max(e.from, scale.start)), x1 = X(Math.min(e.to, scale.end));
    ctx.fillStyle = i % 2 ? TRACK.bandA : TRACK.bandB;
    ctx.fillRect(x0, 0, x1 - x0, bandH);
    ctx.font = TRACK.eraFont;
    ctx.fillStyle = TRACK.era;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const name = e.name.toUpperCase();
    if (ctx.measureText(name).width < x1 - x0 - 8) ctx.fillText(name, (x0 + x1) / 2, 4);
  });

  const bins = Math.max(20, Math.floor(tw / 3));
  const dens = data.density(scale, bins);
  const max = Math.max(1, ...dens);
  ctx.fillStyle = TRACK.density;
  for (let i = 0; i < bins; i++) {
    if (!dens[i]) continue;
    const hh = 2 + 16 * Math.log1p(dens[i]) / Math.log1p(max);
    ctx.fillRect(pad + (i / bins) * tw, bandH - hh, tw / bins + 0.5, hh);
  }

  ctx.font = TRACK.tickFont;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  let lastRight = -Infinity;
  for (const yr of ticks) {
    const x = X(yr);
    ctx.fillStyle = TRACK.tick;
    ctx.fillRect(x - 0.5, bandH, 1, 5);
    const label = formatYear(yr);
    const lw = ctx.measureText(label).width;
    if (x - lw / 2 < lastRight + 8) continue;
    if (x - lw / 2 < 0 || x + lw / 2 > w) continue;
    ctx.fillStyle = TRACK.tickLabel;
    ctx.fillText(label, x, bandH + 7);
    lastRight = x + lw / 2;
  }
}

// ---- selection and the tooltip -------------------------------------------

function onTap(feature, x, y) {
  navigationVersion++;
  if (!feature) { closeTip(); deselect(); return; }
  pause();
  select(feature._civ.id);
  showTip(feature._civ, { x, y }, feature);
}

function select(id) {
  state.selected = id;
  globe.setSelected(id);
  queueURL();
}

function deselect() {
  if (!state.selected) return;
  state.selected = null;
  globe.setSelected(null);
  queueURL();
}

function showTip(civ, anchor, feature) {
  // a colony carries its own name on the map but belongs to its ruler: the
  // card is headed by the name that was tapped and says whose it was
  const label = feature && feature.properties.label;
  state.tipLabel = label;
  const possession = label && label !== civ.name;
  els.tipSwatch.style.background = civ.color;
  els.tipName.textContent = label || civ.name;
  const span = spanWithDuration(civ);
  els.tipSpan.textContent = possession ? `Held by ${civ.name} in ${formatYear(state.year)}` : span;
  const meta = [];
  if (possession) meta.push(`${civ.name}: ${span}`);
  if (civ.kind === 'culture') meta.push('A people or culture, not a state');
  if (civ.capital) meta.push(`Capital: ${civ.capital}`);
  if (civ.region) meta.push(civ.region);
  const drawn = data.featuresOf(civ.id, state.year).length > 0;
  if (data.yearStatus(state.year).state === 'error') meta.push(`Borders could not load for ${formatYear(state.year)}.`);
  else if (!drawn) meta.push(`No border drawn for ${formatYear(state.year)} yet.`);
  els.tipMeta.textContent = meta.join(' · ');
  els.tipMeta.hidden = meta.length === 0;
  els.tipSource.hidden = true;
  els.tipSummary.textContent = 'Loading summary';
  els.tipSummary.classList.add('pending');
  els.tipLine.textContent = meta.length ? meta[0] : '';
  els.tipLine.classList.remove('pending');
  const want = civ.id;
  state.tipSummary = null;
  state.tipLoaded = false;
  if (state.tipCardId !== want) {
    state.tipCardId = want;
    state.tipCard = null;
    state.tipCardPromise = data.card(want);
  }
  Promise.all([data.summaryFor(want), state.tipCardPromise]).then(([summary, card]) => {
    if (state.selected !== want || els.tip.hidden) return;
    state.tipLoaded = true;
    state.tipSummary = summary;
    state.tipCard = card;
    syncTipTime(civ);
    placeTip();
  });
  syncTipTime(civ);
  els.tipZoom.hidden = !drawn;
  state.tipAnchor = state.tipPos ? null : (anchor || null);
  els.tip.hidden = false;
  syncCardRect();
  // the card's materialise plays on every arrival: the class comes off, one
  // reflow, and back on, which is the only way to restart a CSS animation
  els.tip.classList.remove('is-in');
  void els.tip.offsetWidth;
  els.tip.classList.add('is-in');
  setTipOpen(state.tipOpen);
}

// "224 to 651 CE · 427 years": the dates and how long that is, when the
// dates are a polity's own rather than the reach of the maps
function spanWithDuration(civ) {
  const duration = formatCivDuration(civ);
  return duration ? `${formatCivSpan(civ)} · ${duration}` : formatCivSpan(civ);
}

function syncTipTime(civ) {
  const periods = state.tipCardId === civ.id ? matchingPeriods(state.tipCard, state.year) : [];
  const summary = state.tipSummary;
  if (periods.length || summary) {
    const text = periods.length ? periods.map(p => p.summary).join(' ') : summary.text;
    els.tipSummary.textContent = periods.length ? `In ${formatYear(state.year)}: ${text}` : `Across its history: ${text}`;
    els.tipSummary.classList.remove('pending');
    els.tipLine.textContent = firstSentence(text);
    els.tipLine.classList.remove('pending');
    els.tipSource.replaceChildren();
    if (periods.length) {
      const refs = [...new Set(periods.flatMap(p => p.sourceIds || []))];
      for (const ref of refs) {
        const source = (state.tipCard.sources || []).find(s => s.id === ref);
        if (!source?.url) continue;
        const a = document.createElement('a'); a.href = source.url;
        a.target = '_blank'; a.rel = 'noopener'; a.textContent = source.title || 'Source';
        if (els.tipSource.childNodes.length) els.tipSource.append(' · ');
        els.tipSource.append(a);
      }
    } else if (summary?.source) {
      const a = document.createElement('a'); a.href = summary.source.url;
      a.target = '_blank'; a.rel = 'noopener'; a.textContent = summary.source.name || 'Source';
      els.tipSource.append('Summary from ', a);
    }
    els.tipSource.hidden = !els.tipSource.childNodes.length;
  } else if (state.tipLoaded) {
    els.tipSummary.textContent = 'Summary coming soon.';
    els.tipLine.textContent = 'Summary coming soon.';
    els.tipSource.hidden = true;
  }
  const drawn = data.featuresOf(civ.id, state.year).length > 0;
  const label = state.tipLabel;
  const possession = label && label !== civ.name && data.featuresOf(civ.id, state.year).some(f => f.properties.label === label);
  els.tipName.textContent = possession ? label : civ.name;
  els.tipSpan.textContent = possession ? `Held by ${civ.name} in ${formatYear(state.year)}` : spanWithDuration(civ);
  const meta = [];
  if (civ.kind === 'culture') meta.push('A people or culture, not a state');
  if (civ.capital) meta.push(`Capital: ${civ.capital}`);
  if (civ.region) meta.push(civ.region);
  if (data.yearStatus(state.year).state === 'error') meta.push(`Borders could not load for ${formatYear(state.year)}.`);
  else if (!drawn) meta.push(`No border drawn for ${formatYear(state.year)} yet.`);
  els.tipMeta.textContent = meta.join(' · ');
  els.tipMeta.hidden = !meta.length;
  els.tipMore.href = `${SKIN === 'scifi' ? 'scifi-civ.html' : 'civ.html'}?id=${encodeURIComponent(civ.id)}&year=${state.year}`;
  els.tipZoom.hidden = !drawn;
}

function firstSentence(text) {
  const m = /^(.+?[.!?])(\s|$)/.exec(text);
  return m ? m[1] : text;
}

function setTipOpen(open) {
  state.tipOpen = !!open;
  els.tip.dataset.open = String(state.tipOpen);
  els.tipBody.hidden = !state.tipOpen;
  els.tipToggle.setAttribute('aria-expanded', String(state.tipOpen));
  els.tipToggle.title = state.tipOpen ? 'Show less' : 'Show more';
  placeTip();
}

// by the finger on a wide screen (the stylesheet turns it into a bottom
// sheet on phones, where these coordinates are overridden); once dragged, the
// card keeps its place and only stays clamped to the stage
function placeTip() {
  if (state.tipPos) { moveTip(state.tipPos.x, state.tipPos.y); return; }
  const a = state.tipAnchor;
  if (!a) return;
  const sw = els.stage.clientWidth, sh = els.stage.clientHeight;
  const tw = els.tip.offsetWidth, th = els.tip.offsetHeight;
  let x = a.x + 14, y = a.y + 14;
  if (x + tw > sw - 8) x = a.x - tw - 14;
  if (x < 8) x = Math.max(8, Math.min(sw - tw - 8, a.x - tw / 2));
  if (y + th > sh - 8) y = a.y - th - 14;
  if (y < 8) y = 8;
  els.tip.style.left = `${Math.round(x)}px`;
  els.tip.style.top = `${Math.round(y)}px`;
  syncCardRect();
}

// where the card is, in the stage's pixels, for the sci-fi leader line
function syncCardRect() {
  if (els.tip.hidden) { globe.setCardRect(null); return; }
  const s = els.stage.getBoundingClientRect(), t = els.tip.getBoundingClientRect();
  globe.setCardRect({ x: t.left - s.left, y: t.top - s.top, w: t.width, h: t.height });
}

// a dragged card: kept inside the stage with an 8px margin, and remembered
function moveTip(x, y) {
  const sw = els.stage.clientWidth, sh = els.stage.clientHeight;
  const tw = els.tip.offsetWidth, th = els.tip.offsetHeight;
  x = Math.max(8, Math.min(sw - tw - 8, x));
  y = Math.max(8, Math.min(sh - th - 8, y));
  state.tipPos = { x, y };
  els.tip.style.left = `${Math.round(x)}px`;
  els.tip.style.top = `${Math.round(y)}px`;
  syncCardRect();
}

function closeTip() {
  els.tip.hidden = true;
  els.tip.classList.remove('is-in');
  state.tipAnchor = null;
  globe.setCardRect(null);
}

// Go to a polity: pick a year it existed, load that year's borders, turn the
// globe to it and open its card. Links from the card pages ("fell to X")
// arrive here with a dated request, which must not silently change years.
async function jumpToCiv(id, year) {
  const civ = data.civ(id);
  if (!civ) { showHint(`No polity with the id "${id}".`); return; }
  pause();
  const to = civ.to == null ? scale.end : advanceYear(civ.to, -1);
  let yr = Number.isFinite(year) ? year : state.year;
  if (!Number.isFinite(year) && (yr < civ.from || yr > to)) yr = Math.round((civ.from + to) / 2);
  yr = normalizeYear(Number.isFinite(year) ? yr : scale.clamp(yr));
  setYear(yr, { force: true });
  let requestVersion = navigationVersion;
  await data.ensureYear(yr);
  if (navigationVersion !== requestVersion) return;
  let feats = data.featuresOf(id, yr);
  // nothing drawn that year: an undated request moves the clock to the
  // nearest year with a border; a dated one keeps its year but still turns
  // the globe to where the polity's nearest border is, so the visitor is
  // looking at the right place while the card says no border is drawn yet
  // (Amy followed the Parthians' fall to the Sasanians and landed on an
  // empty steppe)
  let where = feats;
  if (!feats.length) {
    const near = data.nearestDrawnYear(id, yr);
    if (near != null && near !== yr) {
      if (!Number.isFinite(year)) {
        setYear(scale.clamp(near), { force: true });
        requestVersion = navigationVersion;
        await data.ensureYear(state.year);
        if (navigationVersion !== requestVersion) return;
        feats = where = data.featuresOf(id, state.year);
      } else {
        await data.ensureYear(near, 0);
        if (navigationVersion !== requestVersion) return;
        where = data.featuresOf(id, near);
      }
    }
  }
  select(id);
  if (where.length) globe.focusFeatures(where);
  showTip(civ, { x: els.stage.clientWidth / 2, y: els.stage.clientHeight * 0.25 }, feats[0]);
}

// ---- search -------------------------------------------------------------

function openSearch() {
  els.search.hidden = false;
  els.searchBtn.setAttribute('aria-expanded', 'true');
  els.searchInput.value = '';
  renderSearch();
  els.searchInput.focus();
}

function closeSearch() {
  els.search.hidden = true;
  els.searchBtn.setAttribute('aria-expanded', 'false');
}

function renderSearch() {
  const q = els.searchInput.value;
  const results = data.search(q, 10);
  els.searchResults.innerHTML = '';
  if (!q.trim()) {
    els.searchResults.innerHTML = `<li class="empty">${data.civList.length} kingdoms, empires and countries to find.</li>`;
    return;
  }
  const seq = ++searchSeq;
  results.forEach((c, i) => addSearchResult(c, i === 0));
  // then the summaries, so a king finds his kingdom: "genghis" brings up the
  // Mongol Empire and its khanates through the sentences that name him
  if (q.trim().length < 3) {
    if (!results.length) els.searchResults.innerHTML = '<li class="empty">Nothing by that name yet.</li>';
    return;
  }
  if (!results.length) els.searchResults.innerHTML = '<li class="empty">Looking through the summaries</li>';
  data.searchText(q, 10 - results.length, new Set(results.map((c) => c.id))).then((more) => {
    if (seq !== searchSeq) return;
    if (!results.length) els.searchResults.innerHTML = more.length ? '' : '<li class="empty">Nothing by that name yet.</li>';
    more.forEach((m, i) => addSearchResult(m.civ, !results.length && i === 0, m.snippet));
  });
}

let searchSeq = 0;
function addSearchResult(c, first, snippet) {
  const li = document.createElement('li');
  li.dataset.id = c.id;
  li.setAttribute('role', 'option');
  li.setAttribute('aria-selected', first ? 'true' : 'false');
  const sw = document.createElement('span'); sw.className = 'swatch'; sw.style.background = c.color;
  const nm = document.createElement('span'); nm.className = 'name'; nm.textContent = c.name;
  const sp = document.createElement('span'); sp.className = 'span num'; sp.textContent = formatCivSpan(c);
  li.append(sw, nm, sp);
  if (snippet) { const hit = document.createElement('span'); hit.className = 'hit'; hit.textContent = snippet; li.append(hit); }
  els.searchResults.appendChild(li);
}

// ---- hints, sharing, URL ----------------------------------------------

function showHint(text) { els.hint.textContent = text; els.hint.hidden = false; }
function hideHint() { els.hint.hidden = true; }

function share() {
  const url = location.href;
  if (navigator.share) { navigator.share({ title: document.title, url }).catch(() => {}); return; }
  const done = () => {
    const old = els.shareBtn.textContent;
    els.shareBtn.textContent = 'Copied';
    setTimeout(() => { els.shareBtn.textContent = old; }, 1400);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done);
  else done();
}

function readURL() {
  const p = new URLSearchParams(location.search);
  const num = (k) => (p.has(k) && p.get(k) !== '' && Number.isFinite(+p.get(k)) ? +p.get(k) : undefined);
  return {
    year: num('y') !== undefined ? Math.round(num('y')) : undefined,
    lon: num('lon'), lat: num('lat'), zoom: num('z'),
    view: p.get('view') || undefined,
    civ: p.get('civ') || undefined,
    play: p.get('play') === '1',
  };
}

function queueURL() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(writeURL, 350);
}

function writeURL() {
  if (!globe) return;
  const v = globe.getView();
  const p = new URLSearchParams();
  p.set('y', String(state.year));
  p.set('lon', v.lon.toFixed(1));
  p.set('lat', v.lat.toFixed(1));
  if (Math.abs(v.zoom - 1) > 0.01) p.set('z', v.zoom.toFixed(2));
  if (state.mode === 'flat') p.set('view', 'flat');
  if (state.selected) p.set('civ', state.selected);
  if (state.playing) p.set('play', '1');
  const next = `${location.pathname}?${p}`;
  if (next !== location.pathname + location.search) history.replaceState(null, '', next);
  // the other skin's explorer, opened on this same view
  if (els.skinBtn) els.skinBtn.href = `${SKIN === 'scifi' ? './' : 'scifi.html'}?${p}`;
}

main();
