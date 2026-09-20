#!/usr/bin/env node
// Rebuilds the base/ folder (the unchanging geography under the borders) and
// the one border file the site does not need a historian for: the world's
// present-day countries. Everything here is public domain Natural Earth data,
// fetched from the world-atlas npm package and the natural-earth-vector
// repository, then trimmed and rounded so the phone downloads less.
//
//   node scripts/build-base.mjs
//
// Outputs:
//   base/land-110m.json           TopoJSON, the default coastline
//   base/land-50m.json            TopoJSON, swapped in when zoomed close
//   base/lakes.json               GeoJSON, the big lakes plus a few landmarks
//   base/rivers.json              GeoJSON, the major rivers (the Nile, the
//                                 Tigris and Euphrates, the Indus, the Yellow
//                                 River: how early civilizations found water)
//   data/borders/modern.geojson   present-day sovereign borders in the site's
//                                 own schema, shown from 2020 onward (the
//                                 historical-basemaps importer then joins
//                                 them onto the polities alive in 2010)
//   data/civilizations-modern.json  one polity entry per modern country
//   base/SOURCE.txt               what is here and where it came from

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/';

// present-day borders count as valid from this year on; before it the
// historians' files take over, and the two must not overlap
const MODERN_FROM = 2020;
const MODERN_TO = 2100;

const RIVER_MAX_SCALERANK = 4;
const LANDMARK_LAKES = new Set(['Lake Van', 'Lake Urmia', 'Dead Sea', 'Sea of Galilee', 'Lake Tuz', 'Lake Sevan',
  'Lake Tharthar', 'Lake Hammar', 'Issyk-Kul', 'Lake Balkhash', 'North Aral Sea', 'South Aral Sea', 'Qinghai Hu',
  'Poyang Hu', 'Tai Hu', 'Hongze Hu', 'Lake Chad', 'Lake Tana', 'Lake Turkana', 'Lake Kyoga', 'Lago Titicaca',
  'Lago de Nicaragua', 'Lago de Chapala', 'Lake Geneva', 'Bodensee', 'Lake Balaton', 'Lake Ladoga', 'Lake Onega',
  'Lake Peipus', 'Lough Neagh', 'Lake Biwa', 'Tonlé Sap', 'Lake Volta', 'Lake Kariba']);

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// 3 decimals is about 110 m at the equator, far below anything a 1:110m
// coastline can resolve, and it roughly halves the file
// (rivers and lakes are decoration, so they get 2 decimals, about 1 km)
function roundCoords(c, k) {
  return typeof c[0] === 'number'
    ? [Math.round(c[0] * k) / k, Math.round(c[1] * k) / k]
    : c.map((d) => roundCoords(d, k));
}
function roundGeometry(g, decimals = 3) {
  if (!g) return g;
  const k = 10 ** decimals;
  if (g.type === 'GeometryCollection') return { ...g, geometries: g.geometries.map((x) => roundGeometry(x, decimals)) };
  return { ...g, coordinates: roundCoords(g.coordinates, k) };
}

// a ring with no area: fewer than three distinct positions, or a planar
// area of nothing; a geometry with nothing left comes back null
function flatRing(ring) {
  if (new Set(ring.map((c) => c.join(','))).size < 3) return true;
  let a = 0;
  for (let i = 0, n = ring.length - 1; i < n; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return Math.abs(a) < 1e-9;
}
function dropFlatRings(geometry) {
  const clean = (rings) => (flatRing(rings[0]) ? null : [rings[0], ...rings.slice(1).filter((r) => !flatRing(r))]);
  if (geometry.type === 'Polygon') { const c = clean(geometry.coordinates); return c ? { type: 'Polygon', coordinates: c } : null; }
  if (geometry.type === 'MultiPolygon') {
    const c = geometry.coordinates.map(clean).filter(Boolean);
    return c.length ? { type: 'MultiPolygon', coordinates: c } : null;
  }
  return geometry;
}

function slug(s) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  await mkdir(join(root, 'base'), { recursive: true });
  await mkdir(join(root, 'data', 'borders'), { recursive: true });

  const [land110, land50, lakes, lakes110, rivers, countries] = await Promise.all([
    fetchJSON(ATLAS + 'land-110m.json'),
    fetchJSON(ATLAS + 'land-50m.json'),
    fetchJSON(NE + 'ne_50m_lakes.geojson'),
    fetchJSON(NE + 'ne_110m_lakes.geojson'),
    fetchJSON(NE + 'ne_50m_rivers_lake_centerlines.geojson'),
    fetchJSON(NE + 'ne_110m_admin_0_countries.geojson'),
  ]);

  await writeFile(join(root, 'base/land-110m.json'), JSON.stringify(land110));
  await writeFile(join(root, 'base/land-50m.json'), JSON.stringify(land50));

  const strip = (fc, keep, decimals = 3) => ({
    type: 'FeatureCollection',
    features: fc.features.map((f) => ({
      type: 'Feature',
      properties: Object.fromEntries(keep.map((k) => [k, f.properties[k]])),
      geometry: roundGeometry(f.geometry, decimals),
    })),
  });
  // The 1:110m rivers layer has only 13 rivers and misses the Tigris, the
  // Euphrates, the Indus, the Ganges and the Huang He, which is most of the
  // point of drawing rivers on a map of early civilizations. So rivers come
  // from 1:50m, kept to the four most prominent scale ranks, without the
  // centerlines Natural Earth draws across lakes.
  const riverFC = { type: 'FeatureCollection', features: rivers.features.filter((f) =>
    f.properties.scalerank <= RIVER_MAX_SCALERANK && f.properties.featurecla !== 'Lake Centerline') };
  await writeFile(join(root, 'base/rivers.json'), JSON.stringify(strip(riverFC, ['name', 'scalerank'], 2)));

  // Lakes: whatever the 1:110m layer draws (the Great Lakes, Baikal, Victoria
  // and the like, taken from 1:50m for a better outline), plus a hand-picked
  // set of small lakes that are landmarks of early history (Van, Urmia, the
  // Dead Sea, the Sea of Galilee, Tuz; Texcoco was drained long ago and is
  // absent from Natural Earth).
  const bigLakes = new Set(lakes110.features.map((f) => f.properties.name).filter(Boolean));
  const lakeFC = { type: 'FeatureCollection', features: lakes.features.filter((f) =>
    bigLakes.has(f.properties.name) || LANDMARK_LAKES.has(f.properties.name)) };
  await writeFile(join(root, 'base/lakes.json'), JSON.stringify(strip(lakeFC, ['name', 'scalerank'], 2)));

  // Present-day countries. Natural Earth marks a few de-facto states and
  // dependencies; we keep sovereign-level units (what a 2026 atlas draws) and
  // give each one an id the rest of the data can point at.
  const polities = [];
  const seen = new Set();
  const features = [];
  // not polities: an uninhabited continent and two remote dependencies
  const SKIP = new Set(['Antarctica', 'French Southern and Antarctic Lands', 'Falkland Islands']);
  for (const f of countries.features) {
    const p = f.properties;
    if (SKIP.has(p.ADMIN)) continue;
    // ADMIN is the everyday name ("Russia", "United States of America");
    // NAME abbreviates ("Dem. Rep. Congo") and NAME_LONG is formal
    const name = p.ADMIN || p.NAME_LONG || p.NAME;
    if (!name) continue;
    const id = slug(name);
    if (seen.has(id)) continue;
    seen.add(id);
    polities.push({
      id,
      name,
      aliases: [p.NAME_LONG, p.NAME, p.NAME_EN, p.FORMAL_EN].filter((a) => a && a !== name).filter((a, i, arr) => arr.indexOf(a) === i),
      from: MODERN_FROM,
      to: null,
      region: p.CONTINENT || p.REGION_UN || null,
      summary: null,
      generated: 'natural-earth-110m',
    });
    // rounding can collapse an islet to a ring with no area, which d3 fills
    // as the whole visible hemisphere (North Korea's did); such rings go
    const geometry = dropFlatRings(roundGeometry(f.geometry));
    if (!geometry) continue;
    features.push({
      type: 'Feature',
      properties: { civ: id, from: MODERN_FROM, to: MODERN_TO, precision: 3 },
      geometry,
    });
  }
  polities.sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(join(root, 'data/borders/modern.geojson'), JSON.stringify({ type: 'FeatureCollection', features }));
  await writeFile(join(root, 'data/civilizations-modern.json'), JSON.stringify(polities, null, 1));

  await writeFile(join(root, 'base/SOURCE.txt'), `Base geography, all public domain Natural Earth (naturalearthdata.com),
rebuilt by scripts/build-base.mjs on ${new Date().toISOString().slice(0, 10)}. Nothing here is edited by hand.

land-110m.json, land-50m.json
  TopoJSON from the world-atlas npm package (v2.0.2, Natural Earth 1:110m
  and 1:50m land). The 110m coastline draws by default; js/globe.js swaps in
  50m once the view is zoomed past a threshold.

lakes.json, rivers.json
  GeoJSON from github.com/nvkelso/natural-earth-vector (ne_50m_lakes and
  ne_50m_rivers_lake_centerlines). Rivers keep scalerank <= ${RIVER_MAX_SCALERANK} and drop the
  lake centerlines; lakes are the ones the 1:110m layer names plus a list
  of small lakes that matter to early history. Properties trimmed to name
  and scalerank, coordinates rounded to 2 decimals (about 1 km).

data/borders/modern.geojson, data/civilizations-modern.json
  ne_110m_admin_0_countries converted to this site's border schema (see
  DATA-FORMAT.md): one feature per country with civ = <slug of the name>,
  from ${MODERN_FROM}, to ${MODERN_TO}, precision 3. The matching polity entries carry
  no summary; those are for the research pipeline to fill in.
`);
  console.log(`land-110m ${JSON.stringify(land110).length} B, land-50m ${JSON.stringify(land50).length} B`);
  console.log(`${lakeFC.features.length} lakes, ${riverFC.features.length} rivers, ${features.length} modern countries`);
}

main().catch((e) => { console.error(e); process.exit(1); });
