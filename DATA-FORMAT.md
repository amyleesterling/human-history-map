# Data format

Everything the map knows lives in `data/`. This file is the contract between
the explorer and whoever writes the data, human or agent. Run
`node scripts/validate.mjs` after any change; it reports what the pages could
not show and rewrites `data/cards/index.json`.

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
  "civilizations": ["civilizations.json", "civilizations-modern.json"],
  "borders": [
    { "file": "borders/sample.geojson", "from": -3500, "to": 2020 },
    { "file": "borders/modern.geojson", "from": 2020, "to": 2100 }
  ],
  "cards": "cards/{id}.json",
  "base": { "land": "base/land-110m.json", "landHi": "base/land-50m.json", "lakes": "base/lakes.json", "rivers": "base/rivers.json" }
}
```

- `anchors` stretch the slider: pairs of `[year, position 0..1]`. Recorded
  history is lopsided, so the last millennium gets more track than the first
  two. Straight lines between anchors; leave it out for a linear axis.
- `civilizations` is one file or a list; they are concatenated.
- `borders` lists every border file with the years it covers. The explorer
  loads a file only when the clock is within about 150 years of its range,
  so split big datasets by era (or by region, or by polity; any split works
  as long as each entry's `from`/`to` covers its features).
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
| `color` | no | `#rrggbb`. Leave it out and the map picks one that differs from every contemporary neighbour. |
| `summary` | no, but wanted | The tooltip text. Without it the tooltip says "Summary coming soon." |
| `fell` | no | `to` is a list: an id links to that polity on the globe at the year of the fall; any other string is shown as a plain name. `year` defaults to `to`. |
| `predecessors`, `successors` | no | Ids. Shown as "Before" and "After" chips on the card. |
| `card` | no | Path relative to `data/` if the card is not at `cards/<id>.json`. |
| `schematic` | no | `true` marks a placeholder border; the card says so. |

## `data/borders/*.geojson`: the borders

Ordinary GeoJSON `FeatureCollection`s. Each feature is one shape a polity
held for a stretch of years. A polity that grew and shrank has several
features with adjoining year ranges; an empire with exclaves is one
`MultiPolygon`.

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
| `precision` | no | `1` approximate (drawn dashed), `2` moderately precise, `3` fixed by treaty or modern survey. |
| `label` | no | Overrides the name drawn on the map for this shape. |
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
- An item is one or two sentences with a fact in it. `year` is optional,
  `circa: true` prints "c." before it. `link` adds a "See on the globe" link
  to another polity at a year.
- `fall` on the card overrides `fell` in the index if both exist.
- Every card must list its sources.
- `data/cards/index.json` is generated by `scripts/validate.mjs`; do not edit
  it by hand.

## House style for all copy

- Every number must be right. Compute it, check it, cite it.
- No em or en dashes anywhere in copy. Use a comma, a colon, a semicolon or a
  full stop. A range reads "380 to 750". Compound names take a plain hyphen.
- Plain declarative sentences. "Visual neurons firing in response to a
  movie", not "before its brain was extracted".
- Names as the people are usually called in English today; put the others
  in `aliases`.
- No modern political judgement in summaries. Say what happened.

## Importing an existing dataset

`scripts/import-historical-basemaps.mjs` converts the year-by-year files of
the open [historical-basemaps](https://github.com/aourednik/historical-basemaps)
project into this format, one border file per snapshot and a polity index.
That dataset is CC BY-NC-SA 4.0, so anything imported from it has to carry
that licence; see the script header.
