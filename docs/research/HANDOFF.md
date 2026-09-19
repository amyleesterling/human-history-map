# Research handoff for Human History Map

Prepared 19 September 2026 against `cbf3905c557a14b9df17ab401513ae60b596b42c`.
The handoff branch includes the subsequent main-branch updates through
`ebc8364f0b0b01b36935f165c0cfd7b66fa896a3`, which change CI and deployment
documentation without changing the reviewed runtime or data.

The product is a phone-friendly Earth that plays through history. Pausing
and tapping opens a short explanation of the selected society at that time.
The reading page emphasizes technology, science, arts, ideas and daily life.
Political endings lead to the relevant successor and date, while cultural
continuity remains visible.

## Build on the existing globe

Keep the static JavaScript and D3 canvas implementation while we establish
correct behavior and measure it on phones. The earlier research plan's
MapLibre proposal was an option before this implementation existed. It is
not a requirement to replace this renderer. The current separation between
data, globe, clock and reading page is useful for parallel work.

At the reviewed commit, the strict validator reported 3,032 polity records,
all represented in at least one border file, and 2,167 with summaries. There
were two full cards, Rome and Han. These are inventory counts, not evidence
that every polity or year has historically verified coverage. The world
layer contains 50 imported historical snapshots followed by a modern layer.

This handoff adds one card, Great Zimbabwe. The other pilot subjects remain
research records until their identities, dates and map relationships are
resolved. No generated borders or summaries need to be regenerated for
these additions.

Read [the implementation review](../reviews/2026-09-19-globe-review.md)
before increasing the volume of data. In particular, border validity,
selection and dated links need a consistent contract.

## What is ready to use

| File | Purpose | Loaded by the app? |
| --- | --- | --- |
| `data/cards/great-zimbabwe.json` | Short sourced card using the current card format | Yes, through the generated card index |
| `data/research/pilot-claims.json` | Source-checked candidate claims, identity questions and evidence dates | No, research staging only |
| `DATA-FORMAT.md` | Existing runtime contract | Implemented by the loaders |
| This document | Agent assignments and integration sequence | No |

The pilot file deliberately does not claim independently reviewed status.
Reading a source and extracting its claims is one pass; checking the claims
against the source and resolving contradictory evidence is another.

## Divide work by deliverable

Use one coordinating integrator and bounded research packets. Parallel
research is useful after the identity and evidence conventions below are
agreed. A researcher should not silently invent a new runtime field or
change another agent's generated output.

| Agent role | Owns | Delivers | Completion condition |
| --- | --- | --- | --- |
| Integrator | `DATA-FORMAT.md`, manifest, shared identity decisions and merges | Accepted schema changes and small integration PRs | Runtime, validation and docs agree |
| Globe engineer | `js/globe.js`, `js/app.js`, `js/timeline.js` | Selection, time, gesture and navigation fixes | Review reproductions resolved; phone flows checked |
| Data engineer | `js/data.js`, import scripts, validator | Effective date rules, replacement rules, bounded loading and retry | Invalid states cannot silently become map facts |
| Regional researchers | Separate dossiers and card files allocated by region and period | Source claims, aliases, period summaries and candidate transitions | Every factual claim has a locator and uncertainty |
| Cartography researcher | Separate proposed geometry packets | Evidence for extent at a dated observation, precision and provenance | Geometric validity and historical support checked separately |
| Independent reviewer | Review records, not the researcher's draft | Accept, revise or reject decisions with reasons | Dates, identities, claims and target links rechecked |

For the first sprint, run these roles with two regional researchers: seven
concurrent agents including the integrator. As engineering tasks finish,
reuse those slots for additional regional packets while retaining an
independent reviewer.

Start regional packets with 5 to 10 related entities. This is a proposed
batch size, not a limit on the atlas. It keeps unresolved names and changing
definitions small enough to review. Split later work across Africa, the
Americas, East and Southeast Asia, South and Central Asia, West Asia,
Europe, and Oceania. Track era coverage as well as regional coverage so the
project does not become an inventory of the best-documented empires.

Assign shared files to the integrator. Researchers can work concurrently on
different cards and staged dossiers, then the integrator runs the validator
to regenerate `data/cards/index.json` once for the combined change.

## Identity before geometry

A polity, a city, an archaeological site and a cultural tradition are
different things. A culture can continue after a government changes or a
settlement is abandoned. A site's heritage boundary is not the frontier of
the society associated with it.

| Pilot subject | Current relationship | Work before map integration |
| --- | --- | --- |
| Uruk recordkeeping | Related to `sumer` | Keep a city and an object findspot distinct from the broad Sumer record |
| Neo-Babylonian Babylon | Related to `babylonia`; transition target `achaemenid-empire` exists | Define the Neo-Babylonian period instead of renaming all Babylonia |
| Great Zimbabwe | Existing `great-zimbabwe` ID | Card can load now; site history does not establish exact kingdom borders |
| Caral-Supe | No matching dedicated ID found | Resolve settlement, wider society and chronology before a new polity |
| Liangzhu | No matching dedicated ID found | Separate the archaeological city from the wider cultural distribution |
| Budj Bim and Gunditjmara | Existing `gunditjmara` ID | Review `kind` and lifetime: the imported 1600 to 1815 range is not the duration of this continuing society |

Generated IDs are a useful starting index. Snapshot appearance and
disappearance do not by themselves establish a polity's founding or fall.
Maintain a crosswalk of source names to reviewed identities. Allow an
unresolved match; a wrong confident match is harder to repair.

## Evidence conventions

For each claim, retain a source URL or bibliographic reference, a precise
locator, the source's date expression, the intended subject, and the
researcher's paraphrase. Distinguish an object's date, a reign, a period of
use, an earliest attestation and an actual event date.

The staging JSON uses `date.earliest` and `date.latest` for an inclusive
evidence range. A null date means that we have not assigned a defensible
calendar year. These are not the runtime's half-open `from` and `to`
intervals. Conversion requires an explicit decision. BCE is negative and
there is no historical year zero in either representation.

Use qualifiers such as "probably" and "earliest surviving evidence" when
the source supports those statements. Do not turn an approximate object
date into an exact invention year. Avoid claims of a unique invention when
the evidence concerns adoption, improvement or independent development.

The pilot file has these top-level fields:

- `schemaVersion`, `preparedOn`, `reviewedCommit` and `status` identify the
  research packet, not a new app format.
- `sources` gives each reference a stable local ID.
- `dossiers` relates a subject to existing IDs without merging identities.
- `claims` contains paraphrases, date metadata and evidence locators.
- `candidateTransitions` records proposed links that still require review.
- `integrationNotes` records the remaining work and unsupported inferences.

## Changes to agree with Claude before scaling

1. **Border observations and validity.** Keep the source snapshot date
   separately from the interval in which the app chooses to display it.
   Intersect a feature's supported validity with a reviewed polity
   lifetime. If no supported replacement exists, show the coverage gap.
   Do not assign the old polygon to a successor automatically.
2. **Replacement geometry.** The current format merges polity fields but
   adds border features alongside existing ones. Define how a reviewed
   region and interval replace an imported observation before adding a
   second set of overlapping borders.
3. **Period summaries.** Add reviewed narrative periods selected by year,
   falling back to an explicitly labeled lifetime overview. The short
   tooltip should answer what this society is doing at the selected time.
4. **Dated contributions.** Separate "At this time" from later developments
   on the card. Broad or uncertain dates need visible qualifiers. The
   eventual ending can still appear as a clearly future event.
5. **Transitions.** A transition should have its own date, type and one or
   more identified targets. Conquest, division, union, succession and
   gradual transformation need different wording. Resolve each target to
   a valid entity and supported view at that date, or explain that map
   coverage is missing. Do not silently jump to a different century.
6. **Coverage and confidence.** Show the requested year, the observation
   date and an approximate-boundary cue when they differ. Treat unknown
   territory, disputed control and overlapping cultural areas explicitly.

These are proposed extensions, not implemented fields. Update the contract,
loader, renderer and validator together in small changes. Keep the present
card structure for content that it can represent honestly.

## Source strategy

The source catalog in the pilot packet uses museum collections and UNESCO
site descriptions for narrowly scoped claims. Broader historical and
cartographic work needs additional scholarly references.

| Source | Useful for | Important scope limit |
| --- | --- | --- |
| [Historical Basemaps](https://github.com/aourednik/historical-basemaps) | Existing world snapshot scaffold | Snapshot intervals are not annual observations |
| [CShapes](https://icr.ethz.ch/data/cshapes/) | A candidate for denser modern state boundaries | Check the release's geographic and temporal coverage before import |
| [OpenHistoricalMap](https://www.openhistoricalmap.org/) | Dated local and regional features | Completeness varies by place and period |
| [Pleiades](https://pleiades.stoa.org/downloads) | Ancient place identity and locations | Place records do not supply full political frontiers |
| [World Historical Gazetteer](https://whgazetteer.org/) | Names and place reconciliation | An identity aid, not a complete boundary archive |
| [Seshat](https://seshat-db.com/) | Comparative historical research and references | Check the evidence and granularity of each variable |

Keep citations for accuracy and correction. This personal-project plan does
not add a rights-clearance workstream.

## Delivery order

1. Repair the reproduced selection and time bugs and add explicit load
   failure recovery. Keep the strict data check in the merge workflow.
2. Prove one complete experience: pause, tap, read a period summary, open
   a card, follow a dated transition, and return to the same map view.
3. Integrate the pilot dossiers after identity review, using points or
   cultural areas when political borders are unsupported. Never fabricate
   a polygon merely to fill the globe.
4. Establish region and era coverage reporting, then expand bounded packets
   in parallel. Generate summaries ahead of publication from accepted
   claims and cache them; a map tap should not wait for an LLM.
5. Benchmark the densest supported view and long playback on actual iOS
   and Android phones. Proposed initial goals are at least 30 frames per
   second during a dense view and a visible response within 150 ms for an
   already loaded selection. These are targets, not measured results.
6. Use a branch preview for changes, verify both pages and deep links there,
   then publish through the existing main-branch GitHub Pages setup.
   Confirm compression,
   cache refresh after data updates, load retry, portrait layout, pinch,
   interrupted playback, keyboard search and screen-reader labels.

The [public site](https://amyleesterling.github.io/human-history-map/) loads
in the review browser. Search, a card page, play, pause and the projection
control were exercised. The latest main branch also runs the strict data
validator on pushes and pull requests. Actual phone performance remains
unmeasured. A release date for expanded coverage or a total research budget
should follow the first accepted packet and phone benchmark, when
throughput and the remaining work can be measured.
