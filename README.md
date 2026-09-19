# Human History Map

**Every known kingdom and civilization on one globe, from the first cities to
the present.** Press play and watch the borders move. Pause, tap a border, and
read what that people made: their inventions, science, arts and ideas, when
they fell and to whom, with a link that takes you to the successor at the
moment of the fall.

A static site with no build step and no framework: two HTML pages, one
stylesheet, five small modules, and a data folder that a research pipeline
fills in. Open `index.html` over any web server and it runs.

## The pages

| Page | What it does |
| --- | --- |
| `index.html` | The explorer. A canvas globe (or a flat map, one tap away) with a timeline from 3500 BCE to today. Play, pause, scrub, pinch, turn. Tap a polity for its summary; "More info" opens its card. Search finds any polity by name and flies to it. The whole view lives in the URL, so a link reproduces the exact year, angle and selection. |
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
base/                    coastlines, lakes and rivers (Natural Earth, public domain)
vendor/                  d3-geo, d3-array, topojson-client, unmodified
scripts/build-base.mjs   rebuilds base/ and the present-day border file
scripts/validate.mjs     checks every data file; run it before committing data
scripts/import-historical-basemaps.mjs   converts an open border dataset into ours
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

Borders, polities and cards are plain JSON in `data/`, described field by
field in **`DATA-FORMAT.md`**. The current contents are **sample data**: two
dozen schematic polities across the whole timeline, two finished cards
(Roman Empire, Han Dynasty), and the present-day countries from Natural
Earth. The research pipeline replaces the schematic borders and fills in the
cards without touching the code.

## Deploying

GitHub Pages from the repository root (there is a `.nojekyll`). Nothing to
build.

## Credits

Built by Amy Robinson Sterling. Base geography from
[Natural Earth](https://www.naturalearthdata.com/) (public domain) via the
`world-atlas` and `natural-earth-vector` projects. Rendering by
[d3-geo](https://github.com/d3/d3-geo) (ISC).
