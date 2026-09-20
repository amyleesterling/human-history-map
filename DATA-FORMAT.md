# Data format

Everything the map knows lives in `data/`. This file is the contract between
the explorer and whoever writes the data, human or agent. Run
`node scripts/validate.mjs` after any change; it reports what the pages could
not show and rewrites `data/cards/index.json`.

Two kinds of files live side by side: **generated** ones (`data/hb/`,
`data/civilizations-modern.json`, `data/borders/modern.geojson`,
`data/summaries-*.json`), rebuilt by the scripts and never edited by hand,
and **written** ones (`data/curated.json`, `data/cards/`, any new border or
polity file you add). To change a generated entry, override it: the same id
in a later file wins (see "Overriding" at the end).

## Years

Years are integers. Negative is BCE, positive is CE, and there is no year 0:
`-550` is 550 BCE, `-1` is 1 BCE, `1` is 1 CE. A polity that fell in 1368 has
`"to": 1368`, and its successor that rose that year has `"from": 1368`; the
end is exclusive, so they never share a frame. `"to": null` means it is still
on the map today.

## Ids

Lower-case words joined by hyphens, unique across every file:
`roman-empire`, `egypt-old-kingdom`, `modern-turkey`. An id is forever; pages
link by it. If two polities could share a name, add the period or region:
`babylon-old`, `babylon-neo`.

## `data/manifest.json`

```json
{
  "version": 1,
  "notice": "optional banner text shown once per visit",
  "timeline": {
    "start": -3500, "end": 2026, "initial": -3000, "autoplay": false,
    "anchors": [[-3500, 0], [-1000, 0.2], [1, 0.38], [1000, 0.58], [1500, 0.72], [1800, 0.85], [2026, 1]],
    "ticks": [-3000, -2000, -1000, 1, 500, 1000, 1500, 1800, 2000],
    "speeds": [5, 25, 100], "defaultSpeed": 25
  },
  "view": { "lon": 38, "lat": 28, "zoom": 1 },
  "eras": [ { "name": "Bronze Age", "from": -3500, "to": -1200 } ],
  "civilizations": ["hb/civilizations-hb.json", "civilizations-modern.json"],
  "summaries": ["hb/summaries-hb.json", "summaries-modern.json"],
  "borders": [
    { "file": "hb/borders/world-bc4000.json", "from": -4000, "to": -3000 },
    { "file": "borders/modern.geojson", "from": 2020, "to": 2100 }
  ],
  "cards": "cards/{id}.json",
  "base": { "land": "base/land-110m.json", "landHi": "base/land-50m.json", "lakes": "base/lakes.json", "rivers": "base/rivers.json" }
}
```

- `anchors` stretch the slider: pairs of `[year, position 0..1]`. Recorded
  history is lopsided, so the last millennium gets more track than the first
  two. Straight lines between anchors; leave it out for a linear axis.
- `civilizations` is one file or a list; they are concatenated, and a later
  entry with the same id overrides the earlier one field by field.
- `summaries` lists files of quoted summaries (below), fetched the first
  time a summary is needed rather than with the index.
- `borders` lists every border file with the years it covers. The explorer
  prioritizes files needed for the selected year and optionally prefetches
  up to two upcoming snapshots within a coordinate budget. Files outside
  that working set are released. Split big datasets by era (or
  by region, or by polity; any split works as long as each entry's
  `from`/`to` covers its features). An entry with `"priority": 1` holds
  researched borders: coarse extents drawn from the written record to fill
  the years the imported snapshots lack. Where a polity has both an
  imported and a researched border for a year, only the imported one draws,
  since a traced snapshot is the better outline; a wrong snapshot is fixed
  in the importer's tables, never by drawing over it.
- `speeds` are playback rates in years per second.

## `data/civilizations*.json`: the polity index

One entry per kingdom, empire, state, city-state, culture or country. The
tooltip is built from this entry alone, so keep it complete.

```json
{
  "id": "abbasid-caliphate",
  "name": "Abbasid Caliphate",
  "aliases": ["Abbasids"],
  "from": 750,
  "to": 1258,
  "capital": "Baghdad",
  "region": "Middle East",
  "color": "#e0a458",
  "summary": "One paragraph, at most about 80 words, for the tooltip. What this civilization was and what it is remembered for. Civilization first, war second.",
  "fell": {
    "year": 1258,
    "to": ["mongol-empire", "Mamluk Sultanate"],
    "text": "One or two sentences on how it ended."
  },
  "predecessors": ["umayyad-caliphate"],
  "successors": ["mongol-empire"],
  "card": "cards/abbasid-caliphate.json"
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `id`, `name`, `from`, `to` | yes | `to` may be `null` for a polity still on the map. |
| `aliases` | no | Other names people search for. |
| `capital`, `region` | no | Shown under the name. |
| `figures` | no | Founders, rulers and other people the polity is known by ("Genghis Khan", "Ashoka"), shown on the card page and found by search, so a name finds its kingdom. Only people the sources name; a list, not a history. |
| `color` | no | `#rrggbb`. Leave it out and the map picks one that differs from every contemporary neighbour. |
| `summary` | no, but wanted | The tooltip text. Without it the tooltip says "Summary coming soon." |
| `fell` | no | `to` is a list: an id links to that polity on the globe at the year of the fall; any other string is shown as a plain name. `year` defaults to `to`. |
| `predecessors`, `successors` | no | Ids. Shown as "Before" and "After" chips on the card. |
| `card` | no | Path relative to `data/` if the card is not at `cards/<id>.json`. |
| `kind` | no | `"state"` (default) or `"culture"` for a people, a hunter-gatherer range or a farming culture: drawn as a faint wash under the states, labelled only when there is room. |
| `circa` | no | `true` when `from` and `to` are only as fine as the source's snapshots; dates then print as "c. 1000 to 1100 CE". |
| `dateBasis` | no | `"map_coverage"` labels the interval as available map coverage, not a researched lifetime. `"historical"` is for source-supported historical dates, including explicitly approximate dates. Snapshot records default to map coverage when `circa` is true; generated Natural Earth records also default to map coverage. |
| `summarySource` | no | `{ "name", "title", "url", "license" }` when `summary` is quoted; the pages show the link. |
| `schematic` | no | `true` marks a placeholder border; the card says so. |
| `wikipedia` | no | The exact English Wikipedia title to quote when the name alone finds a namesake ("Wu" the empress for Wu the state). An empty string means nothing on Wikipedia is about this polity, so quote nothing. Set it in `data/curated.json`; the importer copies it onto the polity and `fetch-summaries` obeys it. |

The tooltip, search results and card header visibly prefix snapshot ranges
with "Map coverage:". A record's first or last map appearance must not be
described as a founding or fall without separate evidence. A historical
date correction changes metadata, not the supporting geometry; researchers
must review both dimensions separately.

## `data/borders/*.geojson`: the borders

GeoJSON `FeatureCollection`s, or TopoJSON `Topology` files with one object
(the loader takes either; TopoJSON shares arcs between neighbours and is
about a third the size). Each feature is one shape a polity held for a
stretch of years. A polity that grew and shrank has several features with
adjoining year ranges; an empire with exclaves is one `MultiPolygon`; an
empire and its colonies are several features with the same years, the
colonies carrying a `label`.

```json
{
  "type": "Feature",
  "properties": { "civ": "byzantine-empire", "from": 640, "to": 1071, "precision": 1, "label": "Byzantium", "note": "after the Arab conquests" },
  "geometry": { "type": "Polygon", "coordinates": [[[26.5, 40.5], [29.0, 41.5], [33.0, 42.0], [26.5, 40.5]]] }
}
```

| Property | Required | Notes |
| --- | --- | --- |
| `civ` | yes | An id from the polity index. Unknown ids are skipped with a console warning. |
| `from`, `to` | yes | The years this shape is on the map (`to` exclusive). Default to the polity's own range if omitted, which is right for a polity drawn once. |
| `precision` | no | `1` approximate (drawn fainter), `2` moderately precise, `3` fixed by treaty or modern survey. |
| `over` | no | `true` on a researched shape that must draw instead of the imported outline for its years, because the snapshot is wrong there and none of the importer's tables (rename, split, carry, drop) can mend it: the 1200 map gives the Southern Song all of China. Rare, and only in a `"priority": 1` file. |
| `label` | no | The name drawn on this shape when it is not the polity's own: a colony, a province, a tetrarch's share. Tapping it opens the polity's card headed by the label ("Angola, held by Portugal in 1914"). |
| `note` | no | Free text for the researchers; not shown. |

Rules for geometry:

- Coordinates are `[longitude, latitude]` in degrees, WGS84.
- `Polygon` or `MultiPolygon` only. Rings must be closed (first position
  repeated last). Winding order does not matter; the loader fixes it.
- Round coordinates to 3 decimals (about 100 m). More is noise and doubles
  the file.
- Keep a file under about 1.5 MB; split by era if it grows past that.
- Coastlines: a polity on the sea should follow the coast, not stop short
  of it or run into the water. Trace the Natural Earth 1:50m coastline
  where you can; the base layer is drawn from it.

### Seams between snapshots

A researched polity usually rises between two snapshots, and the map that
first draws it may come decades later. The loader closes that gap: a polity
with historical dates is drawn from its founding with its earliest shape,
as long as that shape is no more than 150 years later (`BACKFILL_YEARS` in
`js/data.js`). Only the start is stretched. A fallen state's last shape is
never carried forward, since a rump is usually far smaller than the map it
came from.

Where the snapshots label a polygon with a state that had already fallen,
the importer's `MERGES` table renames it for that one year (the 700 map's
"Sui" is the Tang) and its `SPLITS` table lets successive polities share
one polygon until the next map (the 500 map's southern "Jin" is drawn as
the Southern Qi, the Liang and the Chen in turn). Where no snapshot holds a
shape at all, `data/civilizations-seams.json` and
`data/borders/china-seams.geojson` carry entries and coarse extents drawn
by the site after Tan Qixiang's Historical Atlas of China: the Three
Kingdoms, the eastern and western successors of the Northern Wei, and the
Five Dynasties. Each is `precision: 1`, drawn fainter, and its `note` says
so. Three of them carry `over`, because the 1100 and 1200 maps keep the
Song over all of China until 1279 and hold the Jurchen Jin to Manchuria:
the Southern Song south of the Huai and the Qinling from 1127, the Jin
north of that line from 1115, and the Mongol Empire in its place from
1234 until the Yuan is proclaimed in 1271.

## `data/cards/<id>.json`: the info cards

The reading page. Civilization first: what they built, discovered, wrote,
believed and ate. War belongs only in the fall.

```json
{
  "id": "han-dynasty",
  "overview": "A paragraph or two that opens the page.",
  "sections": [
    {
      "title": "Inventions",
      "items": [
        { "year": 105, "text": "Cai Lun presents the court with paper." },
        { "year": 100, "circa": true, "text": "The Nine Chapters on the Mathematical Art." },
        { "text": "Undated items are fine." },
        { "year": -138, "text": "Zhang Qian sets out for the west.", "link": { "civ": "achaemenid-empire", "year": -138 } }
      ]
    }
  ],
  "fall": {
    "year": 220,
    "to": ["Cao Wei", "Shu Han", "Eastern Wu"],
    "text": "How it ended."
  },
  "sources": [
    { "title": "Encyclopaedia Britannica, Han dynasty", "url": "https://www.britannica.com/topic/Han-dynasty" },
    { "title": "Michael Loewe, Everyday Life in Early Imperial China (1968)" }
  ]
}
```

- Suggested section titles, in this order: Inventions, Science, Technology,
  Arts, Ideas and beliefs, Daily life, Trade and exchange, Legacy. Use the
  ones that apply; add others if the civilization calls for it.
- Several map records may share a card only after checking that they describe
  the same subject. Keep the primary `id` on the card, declare every destination
  in `appliesTo: ["primary-id", "other-id"]`, and set the other record's `card`
  path to the primary file in `data/researched-overrides.json`. Record the identity
  evidence in the research packet. The validator checks every association and
  includes all destinations in the card index. Shared prose does not merge
  polygons, change snapshot dates or certify historical identity or geometry.
- An item is one or two sentences with a fact in it. `year` is optional,
  `circa: true` prints "c." before it. `link` adds a "See on the globe" link
  to another polity at a year.
- `fall` on the card overrides `fell` in the index if both exist.
- Every card must list its sources.
- `data/cards/index.json` is generated by `scripts/validate.mjs`; do not edit
  it by hand.

## `data/summaries-*.json`: quoted summaries

An object from polity id to `{ "summary", "source" }`, written by
`scripts/fetch-summaries.mjs` for every polity whose index entry has no
`summary`. The text is the opening of the English Wikipedia article that
matched the name (or "Ancient X" / "History of X" for a long-gone polity
that shares its name with a present-day country), trimmed to a paragraph
and with its dashes rewritten. `source` is `{ "name": "Wikipedia", "title",
"url", "license": "CC BY-SA 4.0" }` and the pages show the link. A polity
whose name matched nothing with confidence has no entry and shows "Summary
coming soon". A `summary` in the index always wins over these.

## House style for all copy

- Every number must be right. Compute it, check it, cite it.
- No em or en dashes anywhere in copy. Use a comma, a colon, a semicolon or a
  full stop. A range reads "380 to 750". Compound names take a plain hyphen.
- Plain declarative sentences. "Visual neurons firing in response to a
  movie", not "before its brain was extracted".
- Names as the people are usually called in English today; put the others
  in `aliases`.
- No modern political judgement in summaries. Say what happened.

## The imported data in `data/hb/`

`scripts/import-historical-basemaps.mjs` converts the year-by-year world
files of the open [historical-basemaps](https://github.com/aourednik/historical-basemaps)
project (GPL-3.0; the licence and attribution sit in `data/hb/`) into this
format:

- One TopoJSON border file per snapshot, `borders/world-<year>.json`,
  valid from that snapshot until the next (4000 BCE, 3000, 2000, 1500,
  1000, 700, 500, 400, 323, 300, 200, 100, 1 BCE, then every century to
  1200, then 1279, 1300, 1400, 1492, 1500, 1530, 1600, 1650, 1700, 1715,
  1783, 1800, 1815, 1878, 1880, 1900, 1914, 1920, 1930, 1938, 1945, 1960,
  1994, 2000, 2010). Every border in a snapshot changes at once at the next
  one; that is the nature of snapshot data.
- One polity per run of consecutive snapshots in which a name appears
  (`civilizations-hb.json`). A gap of more than one snapshot starts a new
  polity with the year in its id: `egypt` is 4000 to 500 BCE and
  `egypt-1815` reaches the present. Dates are snapshot dates (`circa`).
- A shape whose `SUBJECTO` names another polity on the same map (a colony)
  belongs to that polity and keeps its own name as `label`.
- Names the source spells two ways are merged by a table in the script
  ("Han" and "Han Empire"; the four "Rome (…)" tetrarchs); add to it there.
- Present-day countries from `scripts/build-base.mjs` are joined onto the
  polities alive in 2010, so "France" is one polity from 1000 to today.
- `data/curated.json` is merged in last: whatever a curated entry says
  (summary, capital, fall, dates) replaces the imported value for that id.

Run order: `build-base`, then `import-historical-basemaps`, then
`integrate-asia`, then `fetch-summaries`, then `validate`.

## The Asia batches in `data/research/regions/asia-qwen/`

Qwen's deliveries are kept verbatim as `batch-NN-civilizations.json`.
`scripts/integrate-asia.mjs` writes `data/civilizations-asia.json` from
them: it renames Qwen's ids onto the site's where the same polity already
has one (its table `ID_MAP`), skips phases the site treats as one polity
(Western and Eastern Han are `han-dynasty`), keeps a curated entry's text
and takes only the native-script aliases, turns fall targets the index
does not know into plain names, and marks every entry `dateBasis:
historical`. The importer's merge table gives the imported polities the
same ids (Koguryo is `goguryeo`, Tang Empire is `tang`), so Qwen's entries
override them and inherit their borders. `NOTES.md` there records every
decision per batch.

## Overriding

The same id in a later `civilizations` file replaces the fields it names,
so a researched entry can correct an imported one without editing
`data/hb/`. A border in a file listed with `"priority": 1` fills the years
in which the same polity has no imported border; in a year that has one,
the imported border draws and the researched one does not, so a researched
extent for a founding or a seam sits beside the imported snapshots for the
rest of a polity's life without covering them. An imported border that is
wrong is renamed, split, carried or dropped in the importer's tables.

## Period-specific context and endings

Cards may include `periods`, ordered without overlap. Each period contains
`from`, exclusive `to` (or null), `title`, `summary`, `sourceIds` and optionally
`circa: true`. Endpoints are nonzero integer years. Sources referenced by ID
must have matching `id` values in the card's `sources` array. Only a period
containing the selected year can supply an "In this year" summary. A period's
bounds describe the historical phase supported by its sources, not a newly
verified polygon. Describe approximate or disputed bounds explicitly.

Card section items may also carry `sourceIds`. Dated events are separated
into those through the selected year and later events. An earlier event is
not proof that its consequences still held in the selected year. Undated
items remain broader context, never an inferred contemporary fact.

The optional `ending` object supersedes the legacy `fall` object:

```json
{
  "status": "uncertain",
  "text": "A sourced account of what is known and what remains disputed.",
  "sourceIds": ["excavation-report"]
}
```

Allowed statuses are `conquest`, `dissolution`, `transformation`, `continuity`
and `uncertain`. Optional `year` is a nonzero integer; `circa: true` marks an
approximate date. Optional `to` contains existing polity IDs and requires an
explicit year for navigation. A link retains its requested date even when
no border is available there. Unknown successor IDs must remain research
proposals until the identity exists. Never use a coverage endpoint as a fall.

All reading pages address endings and continuity. Missing research is labeled
as research not yet available; it is not presented as historical uncertainty.
A sourced `uncertain` ending means researchers have investigated the question
and the evidence itself is uncertain. Living cultures need evidence of
continuity, not a fall invented from the map's last observation.

For archaeological claims, follow `docs/research/CONTENT-STANDARD.md`: say
what was found, where and in what context, what it reveals, and which parts
are interpretation. "Extensive excavations" alone does not supply a finding.
