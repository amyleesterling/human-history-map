# Kerma: excavation evidence and political ending

`card.json` is a proposed replacement for the staged short Kerma card, using the new periods/ending/sourceIds contract. `evidence.json` maps every narrative paragraph to checked passages. This packet does not change runtime data, polity metadata or geometry.

The card answers what excavation found, what those findings support, what remains interpretive, and what changed under Egyptian conquest. It distinguishes household evidence, civic organization, craft practice, elite mortuary display and continuity after conquest.

## Integration checks

- Use the existing `kerma` ID, but retain the explicit earlier Pre-Kerma period explanation. The imported 3000 BCE shape is not evidence that the later kingdom already existed.
- The `egypt` destination is appropriate for the New Kingdom at the approximate endpoint. Show the circa marker on the ending and its link. The card does not claim a precisely dated fall in 1450 BCE.
- An independent reviewer must verify the card hash before promotion. Sources have stable local IDs for inline references.
- Existing broad runtime metadata may display different map dates. Keep map coverage visibly distinct from historical periods. Geometry still needs its own review.
- The household and palace descriptions are archaeological interpretations; court function is expressly inferred. Rich grave assemblages are not a representative inventory of every person's daily possessions.
- The Met beaker was found at Abydos in Egypt. Manchester Museum's example was excavated at Kerma. The card preserves that distinction.
- The 2012 cattle study reports 4,899 specimens associated with grave 253, not 4,899 human graves. Its Fig. 2 was read directly in the available article transcription. The site-wide cemetery size and total tomb count are estimates and vary between sources; they are omitted.
- The pottery article's final claim of environmental demise is not treated as an established exclusive explanation. The mission describes conquest across several campaigns; local cultural continuity is supported by Stuart Tyson Smith's survey interpretation.

Conservative prose attribution counts, assigning a paragraph's entire word count to each listed source: mission site 151, mission history 187, cattle study 133, Met 71, Manchester 32, Smith 64. No source exceeds its 200-word summary allowance. No text is quoted verbatim.

Structural verification: all 20 claim pointers resolve, all source IDs resolve, period bounds are ordered, JSON parses, and card copy contains no em or en dashes. Full runtime validation belongs to integration because this proposed file is outside the runtime card directory.
