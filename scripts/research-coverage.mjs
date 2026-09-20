#!/usr/bin/env node
// A map label is not evidence of completed research. Keep content, identity,
// chronology and geometry review separate so the next packet is chosen honestly.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { feature as topoFeature } from 'topojson-client';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const exists = name => fs.existsSync(path.join(root, name));
for (const name of ['d3-array', 'd3-geo']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, `vendor/d3/${name}.min.js`), 'utf8'));
}
const { rewind } = await import('../js/data.js');
const manifest = read('data/manifest.json');
const assignment = read('data/research/assignments.json');
const civs = new Map();
for (const file of [].concat(manifest.civilizations)) {
  for (const c of read('data/' + file)) civs.set(c.id, {...civs.get(c.id), ...c});
}
const summaries = Object.assign({}, ...[].concat(manifest.summaries || []).map(f => read('data/' + f)));
const explicit = new Map();
for (const packet of assignment.packets) for (const id of packet.ids) {
  if (!civs.has(id)) throw Error(`Assignment refers to absent ID: ${id}`);
  if (explicit.has(id)) throw Error(`Duplicate research assignment: ${id}`);
  explicit.set(id, packet);
}

const reviewPath = 'data/research/accepted-reviews.json';
const reviews = exists(reviewPath) ? read(reviewPath) : {};
const regions = new Set(['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania']);
// Modern country geometry only routes work to a geographic queue. It is never
// substituted for a historical frontier or used as evidence for polity identity.
const modern = read('data/borders/modern.geojson').features.map(f => {
  rewind(f.geometry);
  return {feature: f, region: civs.get(f.properties.civ)?.region, bbox: d3.geoBounds(f)};
}).filter(c => regions.has(c.region));
const inBox = ([x,y], [[x0,y0],[x1,y1]]) =>
  y >= y0 && y <= y1 && (x0 <= x1 ? x >= x0 && x <= x1 : x >= x0 || x <= x1);
const locate = point => modern.find(c => inBox(point,c.bbox) && d3.geoContains(c.feature,point))?.region;
const observations = new Map();
for (const entry of manifest.borders) {
  const raw = read('data/' + entry.file);
  const fc = raw.type === 'Topology' ? topoFeature(raw, Object.values(raw.objects)[0]) : raw;
  for (const f of fc.features) {
    const id = f.properties?.civ, c = civs.get(id);
    if (!c) continue;
    let o = observations.get(id);
    if (!o) {
      o = {files:new Set(), ranges:new Map(), regions:new Set(), homeRegions:new Set(), lifetimeConflicts:0};
      observations.set(id,o);
    }
    o.files.add(entry.file);
    const from = f.properties.from ?? c.from;
    const to = f.properties.to ?? c.to;
    o.ranges.set(`${from}:${to}`, {from,to});
    if (from < c.from || (c.to !== null && (to === null || to > c.to))) o.lifetimeConflicts++;
    rewind(f.geometry);
    const point = d3.geoCentroid(f);
    const region = locate(point);
    if (region) {
      o.regions.add(region);
      if (!f.properties.label) o.homeRegions.add(region);
    }
  }
}

const records = [...civs.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(c => {
  const o = observations.get(c.id);
  const suggested = [...(o?.homeRegions.size ? o.homeRegions : o?.regions || [])].sort();
  const cardPath = 'data/' + (c.card || manifest.cards.replace('{id}',c.id));
  const hasCard = exists(cardPath);
  const review = reviews[c.id];
  const currentHash = hasCard ? crypto.createHash('sha256').update(fs.readFileSync(path.join(root, cardPath))).digest('hex') : null;
  const accepted = currentHash && currentHash === review?.reviewedFileSha256 ? review : null;
  const packet = explicit.get(c.id);
  const owner = packet?.owner || (suggested.length === 1 && suggested[0] === 'Asia' ? 'QWEN' : 'Unassigned regional queue');
  return {
    id:c.id, name:c.name, from:c.from, to:c.to, kind:c.kind || 'state',
    datesApproximate:!!c.circa,
    geographicQueueHints:suggested,
    owner, packet:packet?.id || null,
    content: {
      summary: c.summary ? 'index_summary' : summaries[c.id]?.summary ? 'imported_summary' : 'missing',
      card: hasCard ? cardPath : null,
      review: accepted?.narrative || (hasCard ? 'not_independently_reviewed' : 'missing')
    },
    identityReview:accepted?.identity || 'unreviewed',
    chronologyReview:accepted?.chronology || 'unreviewed',
    borderReview:accepted?.geometry || 'unreviewed',
    borderFiles:o?.files.size || 0,
    observedIntervals:[...(o?.ranges.values() || [])],
    featuresOutsideIndexedLifetime:o?.lifetimeConflicts || 0
  };
});
const total = {
  indexedRecords:records.length,
  summaries:records.filter(r=>r.content.summary!=='missing').length,
  cards:records.filter(r=>r.content.card).length,
  uniqueCardFiles:new Set(records.map(r=>r.content.card).filter(Boolean)).size,
  missingCards:records.filter(r=>!r.content.card).length,
  independentlyReviewedNarratives:records.filter(r=>r.content.review==='accepted').length,
  reviewedIdentities:records.filter(r=>r.identityReview==='accepted').length,
  reviewedChronologies:records.filter(r=>r.chronologyReview==='accepted').length,
  reviewedBorders:records.filter(r=>r.borderReview==='accepted').length,
  recordsWithLifetimeConflicts:records.filter(r=>r.featuresOutsideIndexedLifetime>0).length
};
const queues = {};
for (const r of records) {
  const keys = r.geographicQueueHints.length ? r.geographicQueueHints : ['Unlocated'];
  for (const key of keys) {
    const q = queues[key] ||= {records:0,cards:0,reviewedNarratives:0};
    q.records++; if(r.content.card)q.cards++; if(r.content.review==='accepted')q.reviewedNarratives++;
  }
}
const result = {
  version:1,
  scope:'Inventory of current repository records, not a complete census of human civilizations. Missing and conflated identities remain to be added or corrected.',
  routingMethod:'Geographic hints use historical feature centroids inside modern country geometry. Hints can be incomplete or cross continental boundaries; they do not establish historical identity, origin, sovereignty or territorial validity.',
  asiaOwner:'QWEN', totals:total, queues, records
};
fs.writeFileSync(path.join(root,'data/research/coverage.json'),JSON.stringify(result,null,2)+'\n');
// Keep every unfilled More info destination in a worklist. Source links and
// staged drafts are research leads, not evidence that a card is publishable.
const candidates = new Map();
const inspectDrafts = dir => {
  for (const entry of fs.readdirSync(path.join(root, dir), {withFileTypes:true})) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) inspectDrafts(file);
    else if (entry.name.endsWith('.json')) {
      const draft = read(file);
      if (draft.id && draft.overview && Array.isArray(draft.sections)) {
        const paths = candidates.get(draft.id) || [];
        paths.push(file);
        candidates.set(draft.id, paths);
      }
    }
  }
};
inspectDrafts('data/research');
const missing = records.filter(r=>!r.content.card).map(r=>({
  id:r.id, name:r.name, owner:r.owner,
  regions:r.geographicQueueHints,
  summaryStatus:r.content.summary,
  sourceLead:civs.get(r.id).summarySource?.url || summaries[r.id]?.source?.url || null,
  stagedDrafts:(candidates.get(r.id) || []).sort()
}));
const worklist = {
  version:1,
  scope:'Every indexed record without a runtime More info card. Drafts and imported article matches require identity, chronology and source review before use. This list does not count incomplete existing cards as finished research.',
  total:missing.length,
  withStagedDraft:missing.filter(r=>r.stagedDrafts.length).length,
  withoutSummary:missing.filter(r=>r.summaryStatus==='missing').length,
  records:missing
};
fs.writeFileSync(path.join(root,'data/research/missing-cards.json'), JSON.stringify(worklist,null,2)+'\n');
const rows = Object.entries(queues).sort(([a],[b])=>a.localeCompare(b)).map(([region,q])=>`| ${region} | ${q.records} | ${q.cards} | ${q.reviewedNarratives} |`);
const report = `# Research coverage\n\nGenerated by \`node scripts/research-coverage.mjs\`.\n\nThis inventory tracks the repository's ${total.indexedRecords} records. It is not a claim that these are all human civilizations. Multiple snapshot IDs can describe one society, and important societies are absent.\n\nQWEN owns Asia. Codex handles the other regional queues and integration. Cross-continental identities require reconciliation.\n\n| Measure | Count |\n| --- | ---: |\n${Object.entries(total).map(([k,v])=>`| ${k} | ${v} |`).join('\n')}\n\n| Geographic queue hint | Records | Cards present | Narratives independently reviewed |\n| --- | ---: | ---: | ---: |\n${rows.join('\n')}\n\nGeographic rows overlap for records found in several regions. Centroid routing is approximate and may leave island or large multi-part societies unlocated. These are work queues, not historical classifications.\n\nA card's presence does not certify its identity, dates or borders. The machine-readable inventory records these review dimensions separately. Research packets under \`data/research/regions/\` contain evidence, unresolved questions and additional societies missing from the map.\n`;
fs.writeFileSync(path.join(root,'docs/research/COVERAGE.md'),report);
console.log(JSON.stringify(total));
if (process.argv.includes('--require-cards') && missing.length) {
  console.error(`${missing.length} More info cards still missing. See data/research/missing-cards.json.`);
  process.exitCode = 1;
}
