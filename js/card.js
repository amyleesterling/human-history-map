// The reading page for one polity: civ.html?id=roman-empire&year=200.
// Everything on it comes from the polity's index entry and, when one has
// been written, its card file (data/cards/<id>.json). The small map at the
// top is the same renderer as the globe, frozen on the polity's borders in
// the requested year, and tapping it opens the explorer at that moment.

import { HistoryData } from './data.js?v=research-2';
import { Globe } from './globe.js';
import { TimeScale, formatYear, formatCivSpan } from './timeline.js?v=research-2';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const id = params.get('id');
const yearParam = params.has('year') ? parseInt(params.get('year'), 10) : NaN;

const data = new HistoryData();

function globeURL(civId, year) {
  return `./?civ=${encodeURIComponent(civId)}&y=${year}`;
}
function cardURL(civId, year) {
  return `civ.html?id=${encodeURIComponent(civId)}${Number.isFinite(year) ? `&year=${year}` : ''}`;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// a "fell to" or "before/after" entry is either the id of a polity we know
// (link with its colour) or a plain name (a dashed pill, no link)
function pill(entry, year, kind = 'globe') {
  const civ = typeof entry === 'string' ? data.civ(entry) : null;
  if (civ) {
    const a = el('a', 'pill');
    a.href = kind === 'globe' ? globeURL(civ.id, year) : cardURL(civ.id, year);
    const sw = el('span', 'swatch'); sw.style.background = civ.color;
    a.append(sw, document.createTextNode(civ.name));
    return a;
  }
  const name = typeof entry === 'string' ? entry : (entry && entry.name) || 'unknown';
  return el('span', 'pill plain', name);
}

async function main() {
  const manifest = await data.load('data/manifest.json');
  const civ = id ? data.civ(id) : null;
  if (!civ) {
    $('nameText').textContent = id ? 'Unknown polity' : 'No polity chosen';
    $('lead').textContent = id
      ? `There is no entry with the id "${id}". It may have been renamed in the data.`
      : 'Open the globe, pause, and tap a border to get here.';
    $('hero').hidden = true; $('lifebar').hidden = true;
    return;
  }

  const tl = manifest.timeline || {};
  const scale = new TimeScale(tl.start ?? -3500, tl.end ?? new Date().getFullYear(), tl.anchors);
  const last = civ.to == null ? scale.end : civ.to - 1;
  const year = Number.isFinite(yearParam) ? Math.max(civ.from, Math.min(last, yearParam)) : Math.round((civ.from + last) / 2);

  document.title = `${civ.name}, ${formatCivSpan(civ)}: Human History Map`;
  $('swatch').style.background = civ.color;
  $('nameText').textContent = civ.name;
  $('dates').textContent = formatCivSpan(civ);
  $('crumbYear').textContent = formatYear(year);
  $('globeLink').href = globeURL(civ.id, year);
  $('heroOpen').href = globeURL(civ.id, year);
  $('minimapLink').href = globeURL(civ.id, year);

  const facts = $('facts');
  const fact = (label, value) => {
    if (!value) return;
    const li = el('li'); li.append(el('b', null, label + ' '), document.createTextNode(value)); facts.appendChild(li);
  };
  if (civ.kind === 'culture') fact('Kind', 'a people or culture, not a state');
  fact('Capital', civ.capital);
  fact('Region', civ.region);
  if (civ.aliases && civ.aliases.length) fact('Also called', civ.aliases.join(', '));

  // the extent map, drawn once the borders for that year are in
  const mini = new Globe($('minimap'), { interactive: false, labels: true, view: manifest.view || {} });
  data.loadBase().then((b) => mini.setBase(b));
  await data.ensureYear(year);
  let feats = data.featuresOf(civ.id, year);
  let shownYear = year;
  if (!feats.length) {
    const near = data.nearestDrawnYear(civ.id, year);
    if (near != null) { shownYear = near; await data.ensureYear(near); feats = data.featuresOf(civ.id, near); }
  }
  mini.setPolities(data.polities(shownYear));
  mini.setSelected(civ.id);
  if (feats.length) {
    mini.focusFeatures(feats, { animate: false, zoom: Math.min(mini.fitZoomFor(feats), 5) });
    $('heroCaption').textContent = shownYear === year
      ? `Borders as drawn for ${formatYear(year)}`
      : `Nearest drawn borders, ${formatYear(shownYear)}`;
    const approx = feats.some((f) => f.properties.precision === 1);
    if (approx) $('heroCaption').textContent += ' (approximate)';
  } else {
    $('heroCaption').textContent = 'No border has been drawn for this polity yet.';
  }

  drawLifebar(scale, civ, year);

  const card = await data.card(civ.id);
  const lead = $('lead');
  const quoted = await data.summaryFor(civ.id);
  let quotedSource = null;
  if (card && card.overview) lead.textContent = card.overview;
  else if (quoted) { lead.textContent = quoted.text; quotedSource = quoted.source; }
  else { lead.textContent = 'The summary for this polity has not been written yet.'; lead.classList.add('pending'); }

  const sections = $('sections');
  if (card && Array.isArray(card.sections)) {
    for (const s of card.sections) {
      if (!s || !Array.isArray(s.items) || !s.items.length) continue;
      const sec = el('section');
      sec.appendChild(el('h2', null, s.title || ''));
      const ul = el('ul', 'items');
      for (const it of s.items) {
        const li = el('li');
        const hasYear = typeof it.year === 'number';
        if (hasYear) li.appendChild(el('span', 'when num', (it.circa ? 'c. ' : '') + formatYear(it.year)));
        else li.classList.add('undated');
        const body = el('span');
        body.textContent = it.text || '';
        if (it.link && it.link.civ && data.civ(it.link.civ)) {
          body.appendChild(document.createTextNode(' '));
          const a = el('a', null, 'See on the globe');
          a.href = globeURL(it.link.civ, Number.isFinite(it.link.year) ? it.link.year : it.year);
          body.appendChild(a);
        }
        li.appendChild(body);
        ul.appendChild(li);
      }
      sec.appendChild(ul);
      sections.appendChild(sec);
    }
  } else if (!card) {
    const p = el('p', 'pending', `The full card for ${civ.name}, with its inventions, science, arts and ideas, has not been written yet.`);
    sections.appendChild(p);
  }

  const fall = (card && card.fall) || civ.fell;
  if (fall && (fall.year != null || fall.text || (fall.to && fall.to.length))) {
    $('fallSection').hidden = false;
    const when = fall.year != null ? fall.year : civ.to;
    const head = when != null ? `Fell in ${formatYear(when)}. ` : '';
    $('fallText').textContent = head + (fall.text || '');
    const to = $('fallTo');
    for (const t of fall.to || []) to.appendChild(pill(t, when != null ? when : civ.to));
  } else if (civ.to == null) {
    $('fallSection').hidden = false;
    $('fallText').textContent = 'Still on the map today.';
  }

  const chain = $('chain');
  const pre = civ.predecessors || [], suc = civ.successors || [];
  if (pre.length || suc.length) {
    $('chainSection').hidden = false;
    if (pre.length) {
      chain.appendChild(el('span', 'pill plain', 'Before'));
      for (const p of pre) { const c = data.civ(p); chain.appendChild(pill(p, c ? (c.to == null ? scale.end : c.to - 1) : civ.from, 'card')); }
    }
    if (suc.length) {
      chain.appendChild(el('span', 'pill plain', 'After'));
      for (const s of suc) { const c = data.civ(s); chain.appendChild(pill(s, c ? c.from : civ.to, 'card')); }
    }
  }

  const sources = [...((card && Array.isArray(card.sources)) ? card.sources : [])];
  if (quotedSource) sources.push({ title: `Summary quoted from ${quotedSource.name || 'its source'}: ${quotedSource.title || ''}`, url: quotedSource.url, note: quotedSource.license ? `(${quotedSource.license})` : '' });
  if (sources.length) {
    $('sourcesSection').hidden = false;
    const ul = $('sources');
    for (const s of sources) {
      const li = el('li');
      if (s.url) { const a = el('a', null, s.title || s.url); a.href = s.url; a.rel = 'noopener'; a.target = '_blank'; li.appendChild(a); }
      else li.textContent = s.title || '';
      if (s.note) li.appendChild(document.createTextNode(` ${s.note}`));
      ul.appendChild(li);
    }
  }

  const foot = [];
  if (civ.schematic) foot.push('The border shown is a schematic placeholder, not a researched one.');
  if (manifest.notice) foot.push(manifest.notice);
  $('foot').textContent = foot.join(' ');
  $('foot').hidden = foot.length === 0;
}

// a strip of the whole timeline with this polity's lifetime lit up and the
// chosen year marked
function drawLifebar(scale, civ, year) {
  const c = $('lifebarCanvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = c.parentElement.clientWidth, h = 22;
  c.width = w * dpr; c.height = h * dpr;
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const X = (yr) => scale.toT(yr) * w;
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  ctx.fillRect(0, 8, w, 6);
  const x0 = X(civ.from), x1 = X(civ.to == null ? scale.end : civ.to);
  ctx.fillStyle = civ.color;
  ctx.fillRect(x0, 7, Math.max(2, x1 - x0), 8);
  ctx.fillStyle = '#fff';
  ctx.fillRect(X(year) - 1, 3, 2, 16);
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillStyle = 'rgba(236,231,220,.5)';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; ctx.fillText(formatYear(scale.start), 0, 11);
  ctx.textAlign = 'right'; ctx.fillText(formatYear(scale.end), w, 11);
}

document.getElementById('shareBtn').addEventListener('click', () => {
  const url = location.href, btn = document.getElementById('shareBtn');
  if (navigator.share) { navigator.share({ title: document.title, url }).catch(() => {}); return; }
  const done = () => { const old = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = old; }, 1400); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done); else done();
});

main().catch((e) => {
  console.error(e);
  document.getElementById('nameText').textContent = 'Something went wrong';
  document.getElementById('lead').textContent = e.message;
});
