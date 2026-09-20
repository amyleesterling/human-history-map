# More info content standard

Every civilization page should answer: who lived here, what did they make and know, how do we know, what changed, and what happened to their political institutions and communities? This is the acceptance standard for all new research and upgrades. Asia remains QWEN's assignment; apply the same standard when integrating it.

## Concrete evidence, meaningful explanation

Do not stop at "extensive excavations", "advanced technology" or "a rich culture". Each archaeological example needs:

1. The actual object, structure or environmental trace found.
2. Its named site, archaeological context and supported period. A museum acquisition is not automatically an excavation context.
3. What it reveals about manufacture, food, water, exchange, institutions, belief or daily life.
4. What is observed versus interpreted, including competing interpretations or missing context when material.
5. A readable source and a precise claim locator. Preserve an explicit connection between the page sentence and its source.

For instance, imported beads demonstrate exchange networks; alone they do not prove that foreign merchants lived there. A burnt building does not identify an attacker. Monumental walls alone do not prove military defenses. Burial wealth is evidence of differentiated treatment, not a complete census of social classes. Absence from an excavation is not proof of historical absence.

Use at least two substantial concrete examples when the evidence permits. This is a research target, not a quota to fill with unsupported claims. For recent states, archival records, buildings, objects and documented practices may be more informative than excavations. Include ordinary people's work, households, food and institutions alongside elite art and famous inventions. Distinguish invention from adoption, refinement and surviving attestation.

Amy also wants children and families to find memorable details about ordinary life: family relationships, social gatherings, learning, food, healthcare, sanitation and toilets, where evidence survives. Explain a specific practice, object or account in approachable language. Light humour is welcome, but never invent a custom for a joke or make suffering, disability or a community the punchline. Historical remedies are described as historical beliefs or practices, not medical advice. Keep dates, local variation and source references visible. A useful example is the Barbadian chattel house: moving house could mean relocating the building itself.

Publish checked batches periodically while the larger coverage project continues, as Amy requested. Report actual coverage and verify the deployed pages; do not describe a batch release as completion of the whole atlas.

## Endings and continuity on every page

A page must explicitly address its appropriate ending or continuity, even when the answer is uncertain:

| Situation | Required explanation |
| --- | --- |
| Conquest or annexation is supported | What polity lost independence, when, by whom, what evidence identifies the event, and what continued afterward. |
| Gradual decline or fragmentation | The sequence and approximate dates, successor polities where supported, and why a single fall year or conqueror would be misleading. |
| Abandoned settlement | When occupation changed, what evidence dates it, and which proposed causes are established or disputed. Separate city abandonment from a state's end. |
| Regime or dynasty changes | Identify the institution that ended; do not imply the population or culture disappeared. |
| Continuing people or culture | State continuity explicitly and explain relevant losses or transformations of sovereignty separately. |
| Research has not established the ending | Say what remains unknown. Do not convert a source's silence into a claim that historians cannot know. |

A successor link is accepted only after checking the historical relationship, the correct target identity, a valid event year and geometry available at that year. Multiple recipients require multiple links. Missing map coverage must be stated; never substitute a modern country simply because it occupies similar territory. Do not manufacture a conqueror to fill the UI.

## Time and identity

Separate cities, archaeological traditions, peoples, states, dynasties and modern nations. For Kerma specifically, pre-Kerma settlement evidence must not automatically become the kingdom's founding date. State supported phases and label approximate dates. A map snapshot interval is not a historical lifetime. A selected-year page should foreground contemporaneous evidence and visibly separate later history; undated items must not be assigned artificial years for filtering.

## Review and publication

For each claim, record the card JSON pointer, source URL, page or section locator, date scope and uncertainty. Prefer excavation reports, research papers, collection catalogues, archives and relevant community sources. Check disagreement between authoritative sources rather than selecting the easiest date. Source lists alone do not certify support.

Independent review must separately assess identity, chronology, material evidence and interpretation, everyday life and achievements, endings/continuity, navigation, and geometry. A narrative accepted for cultural facts does not automatically pass the new depth standard. Keep unresolved claims staged while publishing supported additions.

Run `node scripts/content-depth-audit.mjs` to refresh the inventory. Its candidate passages are mechanical search hints, never completion judgments. Each dimension stays unreviewed until a named reviewer assesses evidence. The dossier queue includes researched but unpublished records; prioritize identity and chronological blockers rather than producing duplicate cards. Run `node scripts/validate.mjs --strict` after data changes.
