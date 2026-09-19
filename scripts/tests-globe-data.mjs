// Behavioral regressions using the real loader, geometry and rendering pass.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
for (const path of ['d3/d3-array.min.js', 'd3/d3-geo.min.js', 'topojson/topojson-client.min.js']) {
  vm.runInThisContext(await readFile(new URL('../vendor/' + path, import.meta.url), 'utf8'));
}
const { HistoryData } = await import('../js/data.js');
const { Globe } = await import('../js/globe.js');
const read = async (path) => JSON.parse(await readFile(new URL('../' + path, import.meta.url), 'utf8'));
const data = new HistoryData();
data.fetchJSON = read;
await data.load();
await data.ensureYear(1914, 0);
const pieces = data.featuresOf('portugal', 1914);
assert.ok(pieces.length > 1, 'fixture contains Portugal and its overseas territories');
for (const selectedId of ['portugal', null]) {
  const drawn = [];
  Globe.prototype._drawPolities.call({ polities: data.polities(1914), selectedId,
    _drawPolity: (_ctx, _path, f, selected) => drawn.push({ f, selected }) }, {});
  assert.deepEqual(drawn.filter((x) => x.f._civ.id === 'portugal').map((x) => x.f), pieces);
  assert.ok(drawn.filter((x) => x.f._civ.id === 'portugal').every((x) => x.selected === !!selectedId));
}
await data.ensureYear(480, 0);
assert.ok(data.featuresOf('western-roman-empire', 475).length > 0);
assert.equal(data.featuresOf('western-roman-empire', 480).length, 0);
assert.ok(!data.polities(480).some((f) => f._civ.id === 'western-roman-empire')); 
await data.ensureYear(-325, 0);
assert.ok(data.featuresOf('achaemenid-empire', -331).length > 0);
assert.equal(data.featuresOf('achaemenid-empire', -325).length, 0);
assert.equal(data.nearestDrawnYear('achaemenid-empire', -325), -331);
const synthetic = new HistoryData();
synthetic.features = [{ properties: { from: 100, to: 300 }, _civ: { id: 'culture', from: 150, to: 200, circa: true } }];
assert.equal(synthetic.featuresOf('culture', 250).length, 1, 'coverage dates must not invent a cultural ending');
synthetic.features[0]._civ.dateBasis = 'historical';
assert.equal(synthetic.featuresOf('culture', 250).length, 0);
assert.equal(synthetic.nearestDrawnYear('culture', 250), 199);

const failing = new HistoryData();
failing.dataDir = '';
failing.files = [{ file: 'test', from: 1, to: 100, state: 'idle', features: [] }];
let attempts = 0;
failing.fetchJSON = async () => { if (++attempts === 1) throw new Error('Simulated network failure'); return { features: [] }; };
const originalError = console.error;
try {
  console.error = () => {};
  await failing.ensureYear(50, 0);
} finally { console.error = originalError; }
assert.equal(failing.isYearReady(50), false);
assert.equal(failing.yearStatus(50).state, 'error');
await failing.ensureYear(50, 0);
assert.equal(attempts, 1, 'a failed fetch waits for explicit retry');
await failing.retryYear(50);
assert.equal(failing.isYearReady(50), true);
assert.equal(failing.yearStatus(50).state, 'ready');
assert.equal(failing.yearStatus(500).state, 'missing');

// A slow old download cannot repopulate the cache after a distant scrub.
const delayed = new HistoryData();
delayed.dataDir = '';
delayed.files = [1, 1000].map((from) => ({ file: String(from), from, to: from + 10, state: 'idle', features: [] }));
let resolveOld;
delayed.fetchJSON = (path) => path === '1' ? new Promise((r) => { resolveOld = r; }) : Promise.resolve({ features: [] });
const old = delayed.ensureYear(1, 0);
await delayed.ensureYear(1000, 0);
resolveOld({ features: [] });
await old;
assert.equal(delayed.files[0].state, 'idle');
assert.equal(delayed.files[1].state, 'ready');

// Dense modern dates used to retain 17 snapshots. Walk the actual manifest.
for (const year of [1860, 1900, 1938, 1960, 2000, 2026]) {
  await data.ensureYear(year);
  await Promise.all(data.files.filter((f) => f.state === 'loading').map((f) => f.promise));
  const retained = data.files.filter((f) => f.state === 'ready');
  const current = retained.filter((f) => f.from <= year && year < f.to);
  assert.ok(retained.length <= current.length + 2);
  assert.ok(retained.filter((f) => !current.includes(f)).reduce((n, f) => n + f.positions, 0) <= 120000);
}
console.log('Passed: multipart drawing, historical/coverage dates, nearest year, failure/retry, stale requests and bounded prefetch.');
