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
  order build-base, import, fetch-summaries, validate. The manifest notice
  tells visitors where the data comes from; keep it honest.
- **Run `node scripts/validate.mjs` after any data change.** It is the only
  test harness. It also regenerates `data/cards/index.json`, which the pages
  read so they never request a card that is not there.
- **Shared CSS lives in `site.css`.** Both pages load it; nothing is pasted
  twice.
- **Body text is sans-serif; years, readouts and ticks are monospace** via
  `.num`.
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
   bottom sheet, one finger turns the globe, two fingers zoom, a tap selects.
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
  every frame. Gestures are hand-written pointer events. `hitTest` uses
  `d3.geoContains` on the sphere. The same class draws the card page's
  small extent map with `interactive: false`.
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
