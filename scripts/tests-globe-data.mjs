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
// the earliest shape of a researched polity reaches back to its founding
const backfill = new HistoryData();
backfill.features = [{ properties: { from: 400, to: 500 }, _civ: { id: 'ming', from: 368, to: 644, dateBasis: 'historical' } }];
assert.equal(backfill.featuresOf('ming', 380).length, 1, 'a researched polity is drawn from its founding with its earliest shape');
assert.equal(backfill.featuresOf('ming', 360).length, 0, 'but not before it');
backfill.features[0]._civ.dateBasis = 'map_coverage';
assert.equal(backfill.featuresOf('ming', 380).length, 0, 'coverage dates never reach back');
backfill.features[0]._civ.dateBasis = 'historical';
backfill.features[0].properties.from = 600;
assert.equal(backfill.featuresOf('ming', 380).length, 0, 'and a shape more than 150 years away stays put');

// where the import and a researched file both draw a polity in a year, the
// imported outline draws; the researched extent fills the years the import lacks
const both = new HistoryData();
const zhou = { id: 'zhou', from: -1046, to: -771, dateBasis: 'historical' };
both.features = [
  { properties: { from: -1000, to: -700 }, _civ: zhou, _priority: 0 },
  { properties: { from: -1046, to: -771 }, _civ: zhou, _priority: 1 },
];
assert.deepEqual(both.featuresOf('zhou', -900).map((f) => f._priority), [0], 'the imported outline wins the year it exists');
assert.deepEqual(both.featuresOf('zhou', -1020).map((f) => f._priority), [1], 'the researched extent fills the founding years');
both.features[1].properties.over = true;
assert.deepEqual(both.featuresOf('zhou', -900).map((f) => f._priority), [1], 'unless the researched shape is marked over');

// a ring with no area is dropped before it can fill the hemisphere
const { dropFlatRings } = await import('../js/data.js');
const flatPieces = { type: 'MultiPolygon', coordinates: [[[[10, 10], [10, 10], [10, 10], [10, 10]]], [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]] };
assert.equal(dropFlatRings(flatPieces), true);
assert.equal(flatPieces.coordinates.length, 1, 'the flat piece goes, the good one stays');
assert.equal(dropFlatRings({ type: 'Polygon', coordinates: [[[5, 5], [5, 5], [5, 5], [5, 5]]] }), false, 'a shape with nothing left is dropped');
await data.ensureYear(1637, 150);
await Promise.all(data.files.filter((f) => f.state === 'loading').map((f) => f.promise));
assert.ok(data.polities(1637).every((f) => f._area > 0), 'no drawn polity in 1637 has a ring without area');

// a duration counts the clock, which has no year zero
const { formatCivDuration } = await import('../js/timeline.js');
assert.equal(formatCivDuration({ from: 224, to: 651, dateBasis: 'historical' }), '427 years');
assert.equal(formatCivDuration({ from: -27, to: 476, dateBasis: 'historical' }), '502 years');
assert.equal(formatCivDuration({ from: -509, to: -27, dateBasis: 'historical' }), '482 years');
assert.equal(formatCivDuration({ from: 1947, to: null, dateBasis: 'historical' }, 2026), '79 years');
assert.equal(formatCivDuration({ from: 1000, to: 1100, dateBasis: 'map_coverage' }), '', 'coverage dates get no duration');

// a king finds his kingdom through the summaries, misspelt or not
const khan = await data.searchText('gengis', 8);
assert.ok(khan.length && khan.every((h) => /genghis/i.test(h.snippet)), 'gengis matches Genghis in the summaries');
assert.ok(khan.some((h) => /mongol|horde|khanate/.test(h.civ.id)), 'and brings up the Mongol polities');
assert.equal((await data.searchText('genghis khan', 8)).length > 0, true, 'every word must match the same summary');

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
console.log('Passed: multipart drawing, historical/coverage dates, founding backfill, imported-over-researched, durations, summary search, nearest year, failure/retry, stale requests and bounded prefetch.');
