# Globe and history data review

Reviewed 19 September 2026 at commit
`cbf3905c557a14b9df17ab401513ae60b596b42c`.
Also checked the subsequent diff through
`ebc8364f0b0b01b36935f165c0cfd7b66fa896a3`: it adds the strict validation
workflow and updates deployment documentation. Runtime and data files are
unchanged. The handoff branch starts from this newer commit.

## Assessment

Keep this implementation and repair the selection and temporal contracts
before expanding the dataset. The code already separates the loader,
renderer, clock and card page cleanly. Local D3 and TopoJSON assets, cached
base drawing, capped device pixel ratio, lazy coastline detail and rendering
on demand are sensible choices to benchmark on phones. The globe and flat
map share a renderer, as does the card's extent map. Search, a native
accessible timeline input, share URLs and civilization-focused cards are
already represented in the implementation. On the published desktop view,
the globe has coherent visual hierarchy, readable labels and restrained
controls. The default view is useful for surveying a period.

The present data is a broad snapshot scaffold. Its 3,032 polity IDs and
2,167 summaries are not a verified census of all civilizations or all
border changes. Only Rome and Han had full cards at this commit. The
Great Zimbabwe card accompanying this review raises that count to three.

## Verification boundary

- Installed the locked development dependencies with `npm ci --ignore-scripts`.
- Ran `node scripts/validate.mjs --strict`: 0 errors and 0 warnings at the
  reviewed commit; 3,032 polities, 3,032 with borders, 2,167 with summaries,
  2 cards.
- Loaded the actual `HistoryData`, `Globe` and `TimeScale` modules in Node
  with the repository's vendored geometry libraries. Supplied local JSON
  through a replacement `fetchJSON` transport and instrumented drawing
  calls. This exercised the real date filtering and selection methods.
- Injected a rejected border fetch to inspect load state behavior.
- Counted the manifest entries requested by the actual lookahead rule and
  their on-disk sizes.
- The connected browser could not open the local preview
  (`net::ERR_BLOCKED_BY_CLIENT`). The subsequently documented
  [GitHub Pages site](https://amyleesterling.github.io/human-history-map/)
  did load. Visually inspected its default desktop globe and exercised
  search, selecting Rome, keyboard scrubbing, More info, a successor link,
  play, pause and the globe/flat control.
- Confirmed the stale card-year link in the published interface. Confirmed
  that the Byzantine successor link reaches 395 CE but reports missing
  borders for that entity at that date.
- No touch-gesture, frame-rate or real phone result is claimed. The new
  Great Zimbabwe card passed data validation but has not been published
  or visually checked in the live site.

P1 means fix before growing the research layer. P2 means a correctness or
product requirement to resolve before a wider phone release. These are
project priorities, not security classifications.

## P1: selecting a polity drops all but one of its features

Location: [`js/globe.js`, `_drawPolities`](../../js/globe.js).

The selection pass holds a single `selected` feature. Every feature with
the selected polity ID is skipped in the main loop, but only the last is
drawn afterward. An empire stored as several features loses its other
pieces. A single MultiPolygon does not trigger this particular problem.

**Reproduction:** load 1914 and select `portugal`. The real data supplies
features labeled Angola, Mozambique and Portugal. Instrumenting
`_drawPolity` while calling `_drawPolities` records only Portugal for the
selected ID. Angola and Mozambique remain in the feature list used for
other operations but are no longer drawn. This also affects selected
polities on the card's small map.

**Fix:** collect all selected features and draw all of them after the
unselected pass.

**Acceptance:** selecting, deselecting and opening Portugal in 1914 retains
every supplied piece. The areas drawn and the areas available for picking
agree.

## P1: corrected polity lifetimes do not constrain imported borders

Location: [`js/data.js`, `polities`, `featuresOf` and
`nearestDrawnYear`](../../js/data.js); imported-data lifetime checks in
[`scripts/validate.mjs`](../../scripts/validate.mjs).

The runtime checks a feature's interval but does not also check its merged
polity's lifetime. Curated dates can therefore contradict the map. The
validator does not reject these mismatches for the imported snapshots.

**Reproduced with actual data:**

| Selected year | Polity | Feature interval | Merged polity interval | Observed result |
| --- | --- | --- | --- | --- |
| 325 BCE | Achaemenid Empire | 400 to 323 BCE | 550 to 330 BCE | Feature returned after declared end |
| 480 CE | Western Roman Empire | 400 to 500 CE | 395 to 476 CE | Feature returned after declared end |

Intervals use the repository's exclusive end convention. These are
internal contradictions even before evaluating the historical precision
of any particular end date.

**Fix:** use the intersection of feature validity and the reviewed entity
lifetime for drawing, picking and nearest-year navigation. Retain the
source snapshot date as distinct metadata. Display missing coverage if
the old feature is removed and a researched replacement does not exist.
Do not infer a successor's full territory from the removed polygon.

**Acceptance:** these two records cannot render as active beyond their
declared ends. A nearest-year fallback stays within the entity lifetime
and visibly explains any difference from the requested date.

## P2: changing the year leaves the open tooltip and its link stale

Location: [`js/app.js`, `setYear`, `refreshPolities` and
`showTip`](../../js/app.js).

`showTip` writes the More info URL using the current year. Subsequent
`setYear` calls do not rebuild it. `refreshPolities` only updates tooltip
metadata when the selection disappears, and does not clear that absence
message if the user returns to a year where it exists.

**Live reproduction:** search for Roman Empire. Its tooltip opens at
184 CE with a More info URL ending in `year=184`. Move the native slider
two increments to the right: the clock reads 185 CE, but the link still
contains `year=184`. Following it opens a card labeled 184 CE. Separately,
the code path for scrubbing outside and then back into the lifetime can
retain the old "Not on the map" message; that path was source-traced.

**Fix:** derive tooltip metadata, period text and navigation URL from the
current selection and displayed year whenever either changes. Guard
asynchronous summary responses against a newer selection.

**Acceptance:** the readout, tooltip and card URL agree after scrubbing
forward, backward, outside a lifetime and back again.

## P2: a failed border download counts as a ready year

Location: [`js/data.js`, `_loadFile` and `isYearReady`](../../js/data.js);
[`js/app.js`, `refreshPolities`](../../js/app.js).

The fetch catch handler stores `state: "error"`, while `isYearReady`
accepts either `ready` or `error`. `_loadFile` will not retry an entry
unless its state returns to `idle`.

**Reproduction:** inject a rejected fetch for the current border file.
The module reports `error`, `isYearReady(year)` returns `true`, and the
visible feature count is zero. The app can then present missing historical
coverage for a transport failure and allow the clock to continue.

**Fix:** separate ready, loading, missing evidence and failed download
states. Offer retry, and pause or retain a clearly labeled last successful
view until the requested data arrives.

**Acceptance:** a simulated failure produces an actionable error and can
recover without reloading the entire page. The date label never implies
that an old or incomplete layer is the complete requested map.

## P2: successor chips do not yet satisfy dated navigation

Location: [`js/card.js`, `pill`](../../js/card.js),
[`data/cards/han-dynasty.json`](../../data/cards/han-dynasty.json).

Han's three `fall.to` values are display names, not resolvable polity IDs:
`Cao Wei`, `Shu Han` and `Eastern Wu`. Looking up each value with the real
`data.civ` returns no entity, so each becomes a plain span rather than a
link. This behavior follows the current format, but leaves a central
product requirement incomplete.

The live Rome card supplies a resolvable Byzantine Empire link at 395 CE.
Following it selects the correct entity and year, but the tooltip reports
"Not on the map in 395 CE." This is an explicit coverage gap, rather than
an unresolved name. Both cases need to be represented in the research
queue, with different fixes.

**Fix:** resolve researched successors to stable IDs and explicit
transition dates. Some endings have several outcomes at different dates,
so a single undifferentiated `fell.year` is insufficient for the general
case. Where no supported boundary exists, link to the entity and explain
the map coverage limit instead of silently substituting another date.

**Acceptance:** every promised successor link resolves to the intended
entity and date. Unresolved names are tracked as editorial work; a link
validator checks target lifetime and available geometry separately.

## P2: the text is about a whole lifetime, not the selected period

Location: [`js/data.js`, `summaryFor`](../../js/data.js) and the section
rendering loop in [`js/card.js`](../../js/card.js).

`summaryFor` accepts an ID only. The card renders every item regardless of
the requested year. Opening Han at 200 BCE still includes the items dated
105 CE and 132 CE. Their dates are printed, so the facts are not literally
relabeled as 200 BCE, but there is no "at this time" narrative or
separation of later developments.

**Fix:** add period summaries and a visible distinction between
contemporary information and later developments. Keep a lifetime overview
and the eventual ending available with clear temporal framing.

**Acceptance:** early and late views of the same polity give relevant
period context; future contributions are identified as later rather than
mixed into the current period.

## P2: the cache's eight-file threshold is not a cache limit

Location: [`js/data.js`, `ensureYear`](../../js/data.js).

The 150-year window extends both before and after the selected year.
Eviction preserves every wanted file, even when there are more than eight.
At 1860 the rule selects 17 border files, totaling 5,130,063 bytes on disk.
That is raw file size only, not compressed transfer size or decoded heap.
It excludes other app data. The dense nineteenth and twentieth centuries
therefore need an explicit memory policy before making phone claims.

**Fix:** prioritize current coverage, prefetch a bounded number of nearby
changes in playback direction, and cap the retained bytes or decoded
features. Measure the working set and frame times on actual devices.

**Acceptance:** extended playback does not exceed the chosen cache budget,
and a slow current request is not crowded out by optional prefetching.
Document the measured device, browser, view and network conditions.

## P2: the clock traverses a hidden year zero

Location: [`js/timeline.js`, `formatYear` and `TimeScale`](../../js/timeline.js);
[`js/app.js`, `setYear` and playback arithmetic](../../js/app.js).

The public data contract excludes year zero, but the continuous numeric
axis includes it. Both `formatYear(-1)` and `formatYear(0)` return
`1 BCE`. Mapping zero through `toT` and back yields a value rounding to
zero. Playback can therefore traverse two internal years with that label.

**Fix:** use a continuous internal chronology with an explicit conversion
to and from historical BCE/CE year labels, or consistently skip zero in
all clock operations. Apply the same convention to URLs and interval
arithmetic.

**Acceptance:** stepping or playing across the boundary yields 2 BCE,
1 BCE, 1 CE, 2 CE. No selection, card link or shared URL contains year zero.

## Additional work after the reproduced issues

- Verify share URL restoration with both a selection and an explicit
  camera. The current startup flow applies the URL camera and then calls
  `jumpToCiv`, which focuses the selection again. Also verify sharing
  immediately after a drag, while URL updates are debounced.
- Reconcile `precision: 1` with the documented dashed-outline promise.
  The polygon draw path currently changes opacity and width without
  applying a dash pattern. Provide a discoverable uncertainty key.
- Review cultural identities. The generated `gunditjmara` entry defaults
  to state behavior and spans 1600 to 1815. Snapshot appearance cannot
  establish the lifetime of a continuing society; the staged Budj Bim
  sources make this an explicit identity-review task.
- Distinguish a modern layer's observation date from the timeline's
  current year. A contemporary-looking world file does not establish
  that every intervening border change was recorded.
- Complete visual and phone checks on a reachable preview: narrow and
  landscape layouts, bottom-sheet scrolling, one-finger drag, pinch,
  cancellation, selecting small islands, repeated deep links, keyboard
  navigation, reduced motion and slow or interrupted loading.

## Integration recommendation

Repair the first two findings and the clock-to-tooltip relationship first.
Then prove one complete dated successor journey with reviewed data. Keep
researchers producing separate source packets and cards while the data
engineer defines observation dates, period content and geometry
replacement. The [research handoff](../research/HANDOFF.md) supplies that
division of work and a small geographically varied pilot.
