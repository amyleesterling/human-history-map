// Research-only companion: retain every 2010 feature except the superseded Sudan.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';
const dir = fileURLToPath(new URL('.', import.meta.url));
const source = new URL('../../hb/borders/world-2010.json', import.meta.url);
const bytes = fs.readFileSync(source);
const raw = JSON.parse(bytes);
const fc = feature(raw, raw.objects[Object.keys(raw.objects)[0]]);
const removed = fc.features.filter(f => f.properties.civ === 'sudan');
if (removed.length !== 1) throw new Error('Expected one existing Sudan feature; inspect changed source');
fc.features = fc.features.filter(f => f.properties.civ !== 'sudan');
fs.writeFileSync(dir + 'world-2010-without-sudan.candidate.geojson', JSON.stringify(fc) + '\n');
fs.writeFileSync(dir + 'background-provenance.json', JSON.stringify({
  source: 'data/hb/borders/world-2010.json',
  sourceSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  removed: removed.map(f => f.properties),
  keptFeatureCount: fc.features.length,
  operation: 'TopoJSON decode, then exact civ-id exclusion; no coordinate simplification',
  runtimeReady: false,
}, null, 2) + '\n');
