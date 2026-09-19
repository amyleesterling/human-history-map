// The reading page for one polity: civ.html?id=roman-empire&year=200.
// Everything on it comes from the polity's index entry and, when one has
// been written, its card file (data/cards/<id>.json). The small map at the
// top is the same renderer as the globe, frozen on the polity's borders in
// the requested year, and tapping it opens the explorer at that moment.

import { HistoryData } from './data.js?v=depth-1';
import { Globe } from './globe.js?v=depth-1';
import { TimeScale, formatYear, formatCivSpan, formatSpan, normalizeYear, advanceYear } from './timeline.js?v=depth-1';

import { matchingPeriods, partitionItems, endingFor } from './card-periods.js?v=depth-1';

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

function appendReferences(parent, ids, card) {
  for (const id of ids || []) {
    const sourceIndex = (card?.sources || []).findIndex(s => s.id === id);
    const source = card?.sources?.[sourceIndex];
    if (!source) continue;
    parent.appendChild(document.createTextNode(' '));
    const a = el('a', 'source-ref', `[${sourceIndex + 1}]`);
    a.setAttribute('aria-label', `Source ${sourceIndex + 1}: ${source.title || 'Supporting evidence'}`);
    a.title = source.title || 'Supporting evidence';
    a.href = `#source-${encodeURIComponent(id)}`;
    parent.appendChild(a);
  }
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
  const last = civ.to == null ? scale.end : advanceYear(civ.to, -1);
  const year = normalizeYear(Number.isFinite(yearParam) ? yearParam : (civ.from + last) / 2);

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
  data.loadBase().then((b) => mini.setBase(b)).catch(console.error);
  let failedMapYear = year;
  async function drawMap() {
  await data.ensureYear(year);
  let feats = data.featuresOf(civ.id, year);
  let shownYear = year;
  let failed = data.yearStatus(year).state === 'error';
  failedMapYear = year;
  if (!feats.length && !failed) {
    // the nearest drawn border may sit in a file the year did not need:
    // try the files of the polity's lifetime, nearest year first
    for (const y of data.candidateYearsFor(civ.id, year).slice(0, 6)) {
      await data.ensureYear(y);
      if (data.featuresOf(civ.id, y).length) break;
    }
    const near = data.nearestDrawnYear(civ.id, year);
    if (near != null) {
      shownYear = near; await data.ensureYear(near); feats = data.featuresOf(civ.id, near);
      failed = data.yearStatus(near).state === 'error'; failedMapYear = near;
    }
  }
  mini.setPolities(data.polities(shownYear));
  mini.setSelected(civ.id);
  if (failed) {
    mini.setPolities([]);
    $('heroCaption').textContent = `Borders for ${formatYear(failedMapYear)} could not fully load. Please retry.`;
  } else if (feats.length) {
    mini.focusFeatures(feats, { animate: false, zoom: Math.min(mini.fitZoomFor(feats), 5) });
    $('heroCaption').textContent = shownYear === year
      ? `Borders as drawn for ${formatYear(year)}`
      : `Nearest drawn borders, ${formatYear(shownYear)}`;
    const approx = feats.some((f) => f.properties.precision === 1);
    if (approx) $('heroCaption').textContent += ' (approximate)';
  } else {
    $('heroCaption').textContent = failed ? `Borders for ${formatYear(failedMapYear)} could not load.` : 'No border has been drawn for this polity yet.';
  }

  let retry = document.getElementById('retryCardMap');
  if (!retry) {
    retry = el('button', 'retry-map', 'Retry map loading'); retry.id = 'retryCardMap';
    $('heroCaption').parentElement.appendChild(retry);
    retry.addEventListener('click', async () => { await data.retryYear(failedMapYear); await drawMap(); });
  }
  retry.hidden = !failed;
  }
  await drawMap();

  drawLifebar(scale, civ, year);

  const card = await data.card(civ.id);
  const lead = $('lead');
  const quoted = await data.summaryFor(civ.id);
  let quotedSource = null;
  if (card && card.overview) lead.textContent = card.overview;
  else if (quoted) { lead.textContent = quoted.text; quotedSource = quoted.source; }
  else { lead.textContent = 'The summary for this polity has not been written yet.'; lead.classList.add('pending'); }

  const context = el('section', 'period-context');
  context.appendChild(el('h2', null, `In ${formatYear(year)}`));
  const periods = matchingPeriods(card, year);
  if (periods.length) {
    for (const period of periods) {
      if (period.title) context.appendChild(el('h3', null, period.title));
      context.appendChild(el('p', 'num', formatSpan(period.from, period.to, { circa: !!period.circa })));
      context.appendChild(el('p', null, period.summary));
      appendReferences(context, period.sourceIds, card);
    }
  } else context.appendChild(el('p', 'pending', 'A sourced account for this selected period has not been added yet. The history below covers other moments too.'));
  lead.before(context, el('h2', 'history-context', 'Across this civilization’s history'));

  const sections = $('sections');
  if (card && Array.isArray(card.sections)) {
    for (const s of card.sections) {
      if (!s || !Array.isArray(s.items) || !s.items.length) continue;
      const sec = el('section');
      sec.appendChild(el('h2', null, s.title || ''));
      const groups = partitionItems(s.items, year);
      for (const [key, items] of Object.entries(groups)) {
      if (!items.length) continue;
      const label = key === 'earlier' ? `Dated events through ${formatYear(year)}`
        : key === 'later' ? `Later than ${formatYear(year)}` : 'Broader context, not dated to this year';
      sec.appendChild(el('h3', 'item-period-label', label));
      const ul = el('ul', 'items');
      for (const it of items) {
        const li = el('li');
        const hasYear = typeof it.year === 'number';
        if (hasYear) li.appendChild(el('span', 'when num', (it.circa ? 'c. ' : '') + formatYear(it.year)));
        else li.classList.add('undated');
        const body = el('span');
        body.textContent = it.text || '';
        appendReferences(body, it.sourceIds, card);
        if (it.link && it.link.civ && data.civ(it.link.civ)) {
          body.appendChild(document.createTextNode(' '));
          const a = el('a', null, 'See on the globe');
          a.href = globeURL(it.link.civ, Number.isFinite(it.link.year) ? it.link.year : (Number.isFinite(it.year) ? it.year : year));
          body.appendChild(a);
        }
        li.appendChild(body);
        ul.appendChild(li);
      }
      sec.appendChild(ul);
      }
      sections.appendChild(sec);
    }
  } else if (!card) {
    const p = el('p', 'pending', `The full card for ${civ.name}, with its inventions, science, arts and ideas, has not been written yet.`);
    sections.appendChild(p);
  }

  const ending = endingFor(card, civ);
  $('fallSection').hidden = false;
  $('fallSection').querySelector('h2').textContent = 'Endings and continuity';
  const when = Number.isFinite(ending.year) ? ending.year : null;
  const prefix = when == null ? '' : `${formatYear(when)}${when > year ? ', later than the selected year' : ''}. `;
  $('fallText').textContent = (ending.circa && when != null ? 'c. ' : '') + prefix + (ending.text || 'The details of this transition have not been added yet.');
  appendReferences($('fallText'), ending.sourceIds, card);
  for (const target of ending.to || []) {
    // Without a researched transition date, offer the destination history.
    $('fallTo').appendChild(pill(target, when, when == null ? 'card' : 'globe'));
  }

  const chain = $('chain');
  const pre = civ.predecessors || [], suc = civ.successors || [];
  if (pre.length || suc.length) {
    $('chainSection').hidden = false;
    if (pre.length) {
      chain.appendChild(el('span', 'pill plain', 'Before'));
      for (const p of pre) { const c = data.civ(p); chain.appendChild(pill(p, c ? (c.to == null ? scale.end : advanceYear(c.to, -1)) : civ.from, 'card')); }
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
    for (const [sourceIndex, s] of sources.entries()) {
      const li = el('li');
      li.appendChild(document.createTextNode(`[${sourceIndex + 1}] `));
      if (s.id) li.id = `source-${encodeURIComponent(s.id)}`;
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
