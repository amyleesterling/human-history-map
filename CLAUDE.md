# Working on Human History Map

Amy's interactive globe of every kingdom and civilization, built to run on a
phone. Static site, no build step, no framework: two pages, one stylesheet,
five modules, a data folder. `README.md` is the map of the code and
`DATA-FORMAT.md` is the contract for the data. Read both before touching
anything.

## What this is for

A visitor presses play at 3500 BCE and watches borders move to the present.
They pause, tap a border, read one paragraph, and tap "More info" for a page
about what that civilization made: inventions, science, technology, arts,
ideas, daily life. The page says when and to whom it fell, and that link
opens the globe on the successor at that year. Civilization first, war a
footnote. That is the whole brief; keep every change in its service.

## Rules that keep the site honest

- **Every number on a page must be right.** Dates, sizes, counts, in code or
  copy. Check before writing; put the derivation in the commit message when
  it is not obvious. A summary that cannot be sourced does not ship.
- **Data lives in `data/`, never in code.** Polities, borders and cards are
  JSON described in `DATA-FORMAT.md`. The pages look things up by id. If a
  page needs a new fact, add a field to the format and document it there.
- **`data/hb/`, the modern files and the summaries are generated.** Fifty
  snapshots imported from historical-basemaps (GPL-3.0, rough by its own
  account), present-day borders from Natural Earth, and summaries quoted
  from Wikipedia (CC BY-SA 4.0, always with the link). Never edit them by
  hand: change `data/curated.json` or the scripts and regenerate, in the
  order build-base, import, integrate-asia, fetch-summaries, validate. The
  manifest notice tells visitors where the data comes from; keep it honest.
- **Asia comes from Qwen, the rest from Codex.** Qwen's batches are kept
  verbatim under `data/research/regions/asia-qwen/` and folded in by
  `scripts/integrate-asia.mjs`; Codex's packets live in the other
  `data/research/regions/` folders and land as cards and
  `data/researched-overrides.json`. When a Qwen id and an imported polity
  are the same thing, harmonize the import's name in the importer's merge
  table rather than keeping two ids.
- **Run `node scripts/validate.mjs` after any data change.** It is the only
  test harness. It also regenerates `data/cards/index.json`, which the pages
  read so they never request a card that is not there.
- **Shared CSS lives in `site.css`.** Both pages load it; nothing is pasted
  twice.
- **Two skins, one set of pages.** `index.html` and `civ.html` are the
  atlas, ink on paper in the manner of an engraved world map (site.css for
  layout, atlas.css for paint); `scifi.html` and `scifi-civ.html` are the
  same markup in the black sci-fi skin (site.css alone, with the scifi-ui
  panels) and are generated from the first two by
  `scripts/build-scifi.mjs`, never edited by hand; the validator fails
  when they are stale. The moon in the bar leads to the sci-fi pages and
  the sun leads back, on the same view. The scripts read `data-skin` on
  the root and follow it for links and canvas paint. The atlas sets its
  page in EB Garamond with Cinzel capitals; the sci-fi skin keeps
  sans-serif body text with monospace readouts via `.num`. The renderer
  has a style table per skin: the atlas globe is paper and ink with a
  hand's wobble on every line; the sci-fi globe is dark, crisp, lit at the
  coasts, its polities translucent panes with lit edges, and it carries
  the lock-on (`_drawLock` in `js/globe.js`): HUD brackets that converge
  on the chosen polity, a scan that sweeps it once, and a leader from the
  brackets to the card, which `js/app.js` reports through `setCardRect`.
  The map itself is lettered classically in both: states in Cinzel
  capitals, a people's range in Garamond italic capitals (both faces
  vendored under `vendor/fonts/`, SIL OFL). Nothing is orange in either.
- **`vendor/` and `base/` are never edited by hand.** Vendor files are copied
  down from upstream with a `SOURCE.txt`; `base/` is rebuilt by
  `scripts/build-base.mjs`.
- **The slider is a slider to assistive tech.** It is a native range input
  with `aria-valuetext` set to the year; keep it that way.
- **No em or en dashes in copy, ever.** Amy's standing rule. Commas, colons,
  semicolons, full stops; "380 to 750"; plain hyphens in compound names.
  The validator warns on any dash it finds in the data. Code comments are
  not copy.

## Checking a change

1. Serve the folder (`python3 -m http.server`) and load both pages. The
   console must be clean and every request must be 200.
2. On a phone-width viewport nothing scrolls sideways, the tooltip is a
   slim chip along the bottom (name, dates, one sentence) whose arrow opens
   the summary and buttons, one finger turns the globe, two fingers zoom, a
   tap selects. Amy asked for the chip because a full card hid the globe.
3. Play from the start at 25 years a second and watch the seams where one
   border file hands over to the next: the clock waits for the file rather
   than showing an empty world.
4. `node scripts/validate.mjs --strict` passes.

## How the pieces fit

- `js/data.js` loads the manifest, the polity index (later files override
  earlier ids), and border files (GeoJSON or TopoJSON) lazily by the years
  they cover, with 150 years of lookahead so playback never waits and
  eviction of files far from the clock so a phone never holds fifty maps.
  It rewinds polygon rings for d3, sorts features by spherical area so
  small polities draw on top and win taps, colours polities so no two
  contemporaries that touch share a colour (a colour once given is kept),
  and fetches the quoted summaries only when one is first needed.
- `js/globe.js` draws on a canvas: the base (ocean, graticule, land, lakes,
  rivers) is cached offscreen until the view moves; polities and labels draw
  every frame. The zoom runs to 96 (a phone then shows about a degree and
  a half across, enough for the small German states of 1831): the
  projection is clipped to the viewport and, from zoom 3, land parts,
  polities and labels outside the visible lon/lat window are skipped, so a
  frame costs no more at depth than at world scale; at depth a name sits on
  the centroid of the part on screen. The source polygons are rough at the
  coasts, so each state's wash reaches 25 km past its edge into unclaimed
  land and sea (the land mask cuts the sea off) and polity ink is drawn
  only inland of a 25 km coastal band, where the coastline is the border
  (`REACH_KM`). A ring with no area is dropped on load, since d3 would fill
  the whole hemisphere with it; the importer and `build-base` drop them at
  the source and the validator warns on any it finds. Gestures are
  hand-written pointer events. `hitTest` uses `d3.geoContains` on the sphere. The same class
  draws the card page's small extent map with `interactive: false`.
- `js/app.js` owns the clock (years per second, rAF), the stretched time
  axis from `js/timeline.js`, the tooltip, search, and the URL
  (`?y=&lon=&lat=&z=&civ=&view=`), which is the share format.
- `js/card.js` renders `civ.html` from the index entry plus the card file.

## Style

- Commit messages: a short, specific first line in the voice of the site
  ("The Han join the Romans on the card shelf"), then the reasoning.
- Comments explain why, not what, and record the user-facing reason for a
  design choice when there is one.
- Soft, declarative copy. Mobile first; test on a narrow viewport by
  default. No transport-control bloat: play, pause, a speed chip, the
  slider, and nothing else.
