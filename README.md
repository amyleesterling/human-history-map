# Human History Map

**Every known kingdom and civilization on one globe, from the first cities to
the present.** Press play and watch the borders move. Pause, tap a border, and
read what that people made: their inventions, science, arts and ideas, when
they fell and to whom, with a link that takes you to the successor at the
moment of the fall.

A static site with no build step and no framework: two HTML pages, one
stylesheet, five small modules, and a data folder. The globe is populated:
fifty world snapshots from 4000 BCE to 2010 from the open
historical-basemaps project, present-day borders from Natural Earth, and a
summary for most of the three thousand polities from Wikipedia, with a
handful written by hand. Open `index.html` over any web server and it runs.

## The pages

| Page | What it does |
| --- | --- |
| `index.html` | The explorer. A canvas globe (or a flat map, one tap away) with a timeline from 3500 BCE to today. Play, pause, scrub, pinch, turn. Tap a polity for a slim chip with its name, dates and one sentence; the arrow opens the summary and "More info" opens its card. Search finds any polity by name and flies to it. The whole view lives in the URL, so a link reproduces the exact year, angle and selection. |
| `civ.html` | The card. `civ.html?id=roman-empire&year=200` shows that polity's extent map for the year, its lifetime on the timeline, an overview, sections of tidbits (inventions, science, technology, arts, ideas, daily life), how and when it ended with links to what came next, and sources. |

## Layout

```
index.html, civ.html     the two pages
site.css                 everything both pages share
js/app.js                the explorer: clock, timeline, tooltip, search, URL state
js/globe.js              the canvas renderer: projection, gestures, labels, hit testing
js/data.js               loads the manifest, polities, borders (lazily by era), cards
js/timeline.js           years, BCE/CE formatting, the stretched time axis
js/palette.js            polity colours
js/card.js               the card page
data/                    the history itself; see DATA-FORMAT.md
data/hb/                 fifty imported world snapshots (borders, polities, summaries)
data/curated.json        hand-written entries merged onto the imported ones
data/cards/              the info cards
base/                    coastlines, lakes and rivers (Natural Earth, public domain)
vendor/                  d3-geo, d3-array, topojson-client, unmodified
scripts/build-base.mjs   rebuilds base/ and the present-day border file
scripts/import-historical-basemaps.mjs   converts the historical-basemaps snapshots
scripts/fetch-summaries.mjs   fills missing summaries from Wikipedia, with attribution
scripts/validate.mjs     checks every data file; run it before committing data
```

## Running it

```
python3 -m http.server 8000      # or: npm run serve
open http://localhost:8000/
```

The pages use ES modules, so they need to be served over HTTP; opening the
file directly will not work.

Checks: `node scripts/validate.mjs` reads every data file and reports
anything the explorer could not show. `--strict` fails on warnings too.

## Data

Borders, polities, summaries and cards are plain JSON in `data/`, described
field by field in **`DATA-FORMAT.md`**. What is there now:

- **Borders**: the fifty snapshots of the
  [historical-basemaps](https://github.com/aourednik/historical-basemaps)
  project (4000 BCE to 2010, GPL-3.0), simplified on the sphere and stored
  as TopoJSON, about 220 KB each, loaded only when the clock is near them.
  Present-day borders from Natural Earth take over in 2020. The project
  calls its maps rough and a work in progress; so does the site's notice.
- **Polities**: one per run of consecutive snapshots in which a name
  appears, about three thousand. Colonies are drawn in their ruler's colour
  with their own name as the label. Hunter-gatherer and farming regions are
  kept as cultures and drawn fainter.
- **Summaries**: the opening lines of the matching English Wikipedia
  article (CC BY-SA 4.0), each with its article link, for polities where an
  article could be matched with confidence. Written summaries in
  `data/curated.json` and `data/researched-overrides.json` win over fetched text.
- **Cards**: the generated `data/cards/index.json` lists published cards.
  Research packets and independent reviews are kept separately under
  `data/research/`; the coverage ledger distinguishes narratives from
  verified identity, chronology and geometry. All cards address endings
  and continuity. Source-supported period summaries follow the selected
  year; later events and undated context are clearly separated.
- **Evidence depth**: `docs/research/CONTENT-STANDARD.md` requires concrete
  discoveries and what they reveal, alongside cultural life and a sourced
  account of how a polity ended or a culture continued.

To regenerate everything (needs `npm install` once, for the TopoJSON tools):

```
node scripts/build-base.mjs                                  # base layers, present-day borders
node scripts/import-historical-basemaps.mjs --fetch          # the fifty snapshots
node scripts/fetch-summaries.mjs                             # Wikipedia openings (cached in .cache/)
node scripts/validate.mjs                                    # check, and write the card index
```

## Deploying

GitHub Pages serves the `main` branch's root directly (Settings, Pages,
deploy from a branch), so a push to `main` is live within a minute with
nothing to build. `.github/workflows/check.yml` runs the data validator on
every push and pull request. The site lives at
https://amyleesterling.github.io/human-history-map/

## Credits

Built by Amy Robinson Sterling. Historical borders from
[historical-basemaps](https://github.com/aourednik/historical-basemaps) by
Andre Ourednik and contributors (GPL-3.0). Summaries quoted from
[Wikipedia](https://en.wikipedia.org/) (CC BY-SA 4.0), each linked from the
page that shows it. Base geography from
[Natural Earth](https://www.naturalearthdata.com/) (public domain) via the
`world-atlas` and `natural-earth-vector` projects. Rendering by
[d3-geo](https://github.com/d3/d3-geo) (ISC).
