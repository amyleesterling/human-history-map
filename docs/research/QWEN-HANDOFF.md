# Shared research boundary with QWEN

Amy assigned Asia to QWEN. Codex's regional researchers cover Africa,
Europe, North and South America, and Oceania. Neither system should mark
the other's work complete without reading its deliverables.

The current app contract is `DATA-FORMAT.md`. Keep Asian evidence packets
in a dedicated folder such as `data/research/regions/asia-qwen/`. New cards
can use existing IDs when the identity and time period actually match.
Stage missing identities and proposed corrections separately. Coordinate
transcontinental empires and successor links through their stable IDs.

## Shared acceptance criteria

For each society or polity, research these dimensions separately:

1. Identity, names, aliases and the distinction between polity, city,
   archaeological culture and continuing people.
2. Chronological phases, with the source's actual degree of precision.
3. Institutions, knowledge, technologies, arts, daily life, trade and
   contributions. An object's date is not automatically an invention date.
4. Political transitions, including their dates, types, target identities
   and evidence. Cultural continuity can outlast a government's end.
5. Territorial observations, source-map dates, disputed or uncertain
   extent and the intervals for which a border is supported.
6. Independent review of the claims and the way they fit the map record.

A short cultural card is progress on dimension 3, not completion of all
six. Where evidence is absent, record the question, sources searched and
what remains unknown. Do not fill the gap with invented precision.

## Evidence packet for subsequent batches

Use a regional `evidence.json` with `region`, `researcher`, `sources` and
`entities`. Each source has `id`, `title`, `url` and a precise `locator`.
Each entity has:

- `id` and `card`: the existing or proposed identity and card path.
- `status`: `source_checked`, pending independent review.
- `claims`: each has `pointer`, `sourceIds` and `locator`. A pointer such as
  `/sections/0/items/0/text` identifies the exact sentence being supported.
- `scopeNotes`: phase restrictions, uncertainty and identity issues.
- `proposedOverrides`: exact changes with separate evidence for the fields.
- `phaseResearch`, `transitionResearch` and `geometryStatus`: explicit
  progress or remaining questions, rather than a single complete flag.

The initial Codex packets have minor structural differences. The normalizer
in `scripts/research-audit.mjs` understands them; prefer the form above for
new batches. Do not put duplicate claim text in evidence when a JSON pointer
already identifies it.

Each independent review should record the reviewer, file SHA-256, checked
sources, requested corrections and separate narrative, identity, chronology
and geometry verdicts. A card with accepted prose can still be blocked from
publication by a misleading date header or incorrect identity.

## Integration checks

Run `node scripts/validate.mjs --strict` for runtime data,
`node scripts/research-audit.mjs` for claim/source wiring, and
`node scripts/research-coverage.mjs` to rebuild the coverage inventory.
Only the integrator regenerates the shared card index during parallel work.
Never hand-edit generated historical snapshots or silently replace a
heritage-site boundary with a kingdom frontier.

`data/research/coverage.json` inventories all current map records. Its
geographic hints route work using feature centroids and modern geography;
they are not researched historical classifications. Asia-only hints are
assigned to QWEN, while cross-continental cases remain explicit.

## Publication checkpoints

Run `node scripts/research-audit.mjs`, then `node scripts/research-reviews.mjs`, then `node scripts/research-coverage.mjs` and `node scripts/validate.mjs --strict`. Independent acceptance is tied to the reviewed card SHA-256. Keep new batch cards in regional `proposed-cards/` directories until review, even when the ID already exists.
