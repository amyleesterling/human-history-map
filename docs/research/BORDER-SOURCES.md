# Border sources and acquisition plan

Checked 19 September 2026. This is a source-checked acquisition checkpoint, pending independent review. Asia remains with QWEN. No runtime border files or manifests were changed. The machine-readable inventory is `data/research/border-sources.json`.

The first practical increment is a reviewed CShapes import. Earlier history needs multiple regional sources and map digitization; no inspected source supplies all civilizations or continuous borders through recorded history.

| Source | Useful coverage | Acquisition and limits |
| --- | --- | --- |
| [CShapes global](https://icr.ethz.ch/data/cshapes/) | Global country-period polygons, 1886-2019 | Official GeoJSON downloaded: 710 features, 26.34 MB. CSV, ZIP shapefile, SQL and R links also exist. Exact URLs and checksums are in the inventory. |
| [CShapes-Europe](https://icr.ethz.ch/data/cshapes/CShapes-Europe.geojson) | European coverage advertised from 1816 | Downloaded: 322 features, 4.57 MB. Observed years span 1806-2023, but that does not establish complete coverage for those endpoints. |
| [Euratlas GIS](https://www.euratlas.net/shop/maps_gis/gis_1500.html) | 21 snapshots from year 1 through 2000; 15W-50E, 20N-60N | Shapefiles distinguish sovereignty, territorial holder, provinces and uncertain borders. Public 1500 demo ZIP link confirmed; full data not acquired. Centennial intervals cannot establish annual transitions. |
| [AWMC](https://awmc.unc.edu/gis-data/) | Ancient Mediterranean physical and cultural geography | GeoJSON repository and shapefile archives. Inspect exact political-border files and period metadata before assigning dates. |
| [World Historical Gazetteer](https://docs.whgazetteer.org/content/technical/apis.html) | Place identity and citations worldwide | LPF JSON and reconciliation API; most endpoints require a token. Place points and habitation dates are not sovereign border polygons. |
| [Native Land Digital](https://api-docs.native-land.ca/) | Indigenous territory research, particularly Americas/Oceania | Provider explicitly distinguishes these areas from official legal boundaries. No dated polygon series verified. |
| [AIATSIS](https://aiatsis.gov.au/explore/map-indigenous-australia) | Australian language/social/nation group context | General group locations from a 1996 compilation. Intentionally approximate, not fixed borders or a historical time series. |
| [Rumsey / Stanford](https://www.davidrumsey.com/about) | Dated map sheets, circa 1550 onward, worldwide | Raster evidence and georeferencing tools; lines require interpreted, documented digitization. |
| [IBGE](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/) | Brazilian administrative geography | Edition-specific meshes; not precolonial civilization boundaries. Historical archive details remain unverified. |

Newberry historical county boundaries and Harvard AfricaMap remain access-blocked leads. The inventory records attempted URLs without inventing coverage or downloads.

## What the current basemap can and cannot establish

[Historical-basemaps](https://github.com/aourednik/historical-basemaps) supplies approximate world/continental snapshots and ordinal border precision. Local inspection of `scripts/import-historical-basemaps.mjs` found that it extends each shape to the next snapshot, bridges one absent snapshot when grouping names, colors dependencies by rulers and joins modern countries by name. These are display and identity heuristics. They do not establish political founding dates, endings or intervening borders. Its 50 local historical files run from 4000 BCE to 2010, with a 2020 modern handoff.

Record `snapshotYear` separately from historical validity. Never interpolate vertices to manufacture unknown conquests, and never extend a polygon merely because narrative research establishes a longer state lifetime.

## CShapes inspection findings

The [coding manual](https://icr.ethz.ch/data/cshapes/CShapes-2.0_Codebook.pdf) models legal sovereignty and excludes some small, unrecognized or temporary changes. It also describes approximate dates and cases where contemporary lines were projected backward because evidence was absent. Preserve these limitations rather than presenting every line as exact.

The global GeoJSON has separate date components plus timestamp strings offset by hours into the preceding day. Use reviewed component dates, retaining original fields. Its export lacks the `status`, `ruledby` and undefined-border fields discussed in the manual. Recover them from another official format before assigning colonial sovereignty.

Europe uses a different schema: `From`, `To`, `Id`, `Holder`, `Name`, `Status`, with integer years. Belgium has overlapping 1886-1919 and 1886-2023 records. A full import is blocked pending explanation. Do not silently pick one or apply the global schema to this file.

## Reproducible samples

`data/research/border-samples/` contains an extraction script and two exact-source GeoJSON samples:

- Denmark: four intervals, 1816-1864, 1865-1885, 1886-1919, 1920-2023. Candidate entity `denmark-1815`; boundary-event review and year semantics remain pending.
- South Sudan: 9 July 2011 through 31 December 2019 in source date components. Candidate entity `south-sudan`; integrate alongside the changed Sudan polygon, never as an overlapping addition to the old Sudan extent.

The script requires the full source SHA256, exact source-name selection and an output inside the research sample folder. It checks coordinate ranges, finite values, polygon types and ring closure, preserves all source attributes and does not simplify geometry. Topological validity, historical correctness and globe winding still require review.

```bash
curl -L --fail https://icr.ethz.ch/data/cshapes/CShapes-Europe.geojson -o /tmp/CShapes-Europe.geojson
python data/research/border-samples/import-cshapes-sample.py /tmp/CShapes-Europe.geojson data/research/border-samples/cshapes-europe-denmark.raw.geojson --name Denmark --sha256 9831764d2ad17e37bc009031829265621534de097f7b3e8d6928d1a828436279
```

If the checksum changes, inspect the new source version instead of bypassing the check. Global download: `https://icr.ethz.ch/data/cshapes/CShapes-2.0.geojson`, SHA256 `384b1ea90b9419f30a858d7ec237c85a22c60d1b35b5f85f215a1204f9989d42`.

## Integration sequence

1. Verify source intervals and political meanings, then crosswalk source identifiers to dated entity phases. A place-name match is only a candidate.
2. Retain sovereignty, territorial holder, disputed claims, actual control and cultural territory as separate meanings. Unknown boundaries remain unknown.
3. Review neighboring changes together, first Sudan/South Sudan and Denmark. Identify source-resolution artifacts separately from territorial events.
4. Validate topology, date endpoints, antimeridian behavior and spherical ring winding. Convert approved geometry to shared-arc TopoJSON with measured simplification error.
5. Load date/region chunks on demand and verify mobile selection and transition behavior before replacing runtime snapshots.

For pre-1886 Africa and precolonial Americas/Oceania, prioritize dated regional map sheets and locally grounded territorial evidence. Record publication date separately from depicted period, control points, map legend, line interpretation and disagreement. Settlements, influence networks and uncertain cultural areas may be more accurate than a filled state polygon.
