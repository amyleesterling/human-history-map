# Americas research

This batch covers fourteen subjects across the Americas. It is a source-checked
starting collection, pending independent review, not completed regional coverage.
QWEN owns Asia. No Asian research or geometry is changed here.

`evidence.json` maps each overview and individual card item to a source and a
passage locator. Undated items describe a practice within the card's stated
scope; they do not claim that an invention happened in the selected year.
The public card format does not yet support period filtering or claim-level
citations. The evidence sidecar preserves those distinctions for integration.

## Identity and chronology decisions

- `maya` is an umbrella for distinct societies and city-states. Its map label
  cannot be treated as one empire. A fall of one kingdom is not a Maya extinction.
- `zapotec` is only one short run in the imported snapshots. The card discusses
  Monte Alban with explicit period context. It must not imply that all Zapotec
  societies began or ended at those snapshot boundaries.
- `pueblos` is an umbrella, not a unified Pueblo state. Chaco and Taos examples
  are named individually. Continuing communities require a separate continuity
  model from the finite map snapshot intervals.
- `ho-de-no-sau-nee-ga-haudenosaunee` is an imported 1492 snapshot label for a
  continuing confederacy. It must not acquire an invented fall in 1500. The
  existing `iroquois` record needs identity reconciliation rather than a second
  independent civilization count.
- Existing `wari` names the Amazonian Wari' people. It is NOT the Andean Wari
  polity. `wari-andean` is staged under a distinct proposed identity.
- Caral, Tiwanaku and Cahokia also need identity records before public cards
  can be integrated. Archaeological property boundaries are not state borders.
- Teotihuacan chronology is disputed across accessible institutional summaries:
  the Met's 2024 essay places core burning around 550 CE and major depopulation
  after 600; UNESCO's older account describes seventh-century burning and
  abandonment. The card follows the newer essay for its qualified chronology.
  No exact conquest date or named conqueror is manufactured.
- The Inca card uses 1533 for the loss of imperial power in the existing record,
  while recording a research gap for the later Vilcabamba state. This is not a
  date when Andean cultures ended.

## Integration

Runtime cards use existing IDs. Four new-identity cards remain in
`staged-cards/`. Proposed summary and identity changes live in `evidence.json`;
the integration owner must review them before editing `data/curated.json`.
The local validator checks data shape, not historical truth. It is run centrally
because it rewrites the shared card index. This researcher does not edit that
shared file, generated data, borders, scripts or the manifest.

Source locators refer to headings, paragraph openings or museum object numbers,
not transient search result IDs. Two source pages from one museum are
complementary evidence, not independent institutional corroboration.

## Next queue

1. Split the Maya umbrella into researched Tikal, Calakmul, Palenque, Copan,
   Caracol, Chichen Itza, Mayapan and Itza records with dated relationships.
2. Add Chavin, Paracas, Nasca, Sican, Recuay, Chachapoyas, Muisca, Tairona,
   Mapuche and Amazonian regional histories. Resolve Andean chronological
   disagreement using excavation reports, not a single museum timeline.
3. Research Hopewell, Adena, Poverty Point, Watson Brake, Hohokam, Mogollon,
   Paquime, Moundville, Etowah and individual Mississippian polities. Keep
   archaeological horizons separate from sovereign entities.
4. Expand continuing nations with their own institutional sources, including
   Cherokee, Muscogee, Choctaw, Chickasaw, Seminole, Anishinaabe, Cree, Inuit,
   Haida, Tlingit, Coast Salish and the distinct Pueblo communities.
5. Cover Caribbean societies and colonial and post-independence states, with
   attention to Indigenous continuity, everyday life and cultural exchange.
6. Research each border transition separately. None of the institution pages
   used for the cards supplies a year-by-year political boundary dataset.

## Open evidence gaps

The batch does not claim comprehensive coverage of mathematics, medicine,
agriculture or technology. Caral needs a complementary excavation source;
Maya calendrics and present-day continuity need an accessible specialist or
community source; the live Smithsonian Maya subsite was unavailable during
this pass. Further dated object studies and Indigenous-authored accounts are
queued, not silently treated as checked.
