# Sudan / South Sudan candidate

This staged replacement fixes a real gap: the current registry and Natural Earth geometry introduce South Sudan in 2020, while the 2010 world snapshot retains undivided Sudan through 2019. The [World Bank country overview](https://www.worldbank.org/ext/en/country/southsudan) dates South Sudan's independence to 9 July 2011.

The candidate uses three unchanged CShapes polygons: Sudan before the split, Sudan afterward, and South Sudan afterward. Sudan continues; this is not a fall to South Sudan. Exact source dates are retained, and inclusive source end dates become exclusive next-day endpoints.

`sudan-pair-integration-candidate.json` contains source IDs, matched existing IDs, date observations, proposed registry correction and held manifest replacement entries. Nothing is applied to runtime. The paired file is accompanied by a decoded 2010 background with the superseded Sudan feature removed; this prevents that particular duplicate but does not resolve neighboring-source disagreements.

## Verification and unresolved conflicts

- Shapely 2.1.2 reports all three polygons valid. The post-split polygons have zero intersection, and their union equals the pre-split outline exactly.
- Vendored D3 with the app's winding correction places Khartoum in Sudan and Juba in South Sudan after the split. Both lie in the pre-split polygon.
- Mixed-source neighbors overlap the candidate. The largest planar diagnostic intersections are Egypt, 1.004 square degrees, and Ethiopia, 0.428. These are angular diagnostics, not physical areas or proof of a particular historical claim. Source differences and disputed sectors need independent review.
- The 2020 Natural Earth handoff differs from CShapes. Symmetric differences are 3.952 square degrees for Sudan and 3.043 for South Sudan. Do not animate those source-resolution differences as a territorial event.

The detailed results are in `sudan-pair-geometry-qa.json` and `sudan-pair-spherical-qa.json`. These checks establish technical consistency of the pair, not historical correctness of every segment.

## Year precision

The app rounds slider, URL and playback values to integers. The exact transition is encoded as `2011.517808219178`, a Gregorian decimal year. Consequently, the current app shows the pre-split shape at integer 2011 and the post-split pair at integer 2012. It cannot pause on the actual July date.

Before runtime integration, choose and label a consistent observation convention or add exact-date selection. An end-of-year view could show the new countries in the 2011 frame, but that is a display convention, not a claim that independence occurred on 1 January. The proposed founding year correction to 2011 is held separately from geometry activation.

## Reproduction

From the repository root, with the SHA-pinned global source downloaded as described in `docs/research/BORDER-SOURCES.md`:

```bash
python data/research/border-samples/import-sudan-pair.py /tmp/CShapes-2.0.geojson
node data/research/border-samples/stage-sudan-background.mjs
```

The importer writes only inside this research folder. The background staging script records the current 2010 source checksum and requires exactly one Sudan feature. Review changed input checksums before reusing the candidate. Independent review of identity, boundary semantics, neighbors and date behavior is required before replacing manifest entries.
