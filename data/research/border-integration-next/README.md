# Sudan transition: independent integration review

Checked 19 September 2026. The existing paired replacement is **not ready for runtime** because it still introduces mixed-source overlaps. The dated political transition itself is accepted. This review produces a reproducible source-consistent neighborhood sample and an explicit annual observation contract. Nothing in the runtime manifest was changed.

## Accepted date and annual frames

South Sudan became independent on **9 July 2011**, independently checked against the [World Bank country overview](https://www.worldbank.org/ext/en/country/southsudan), Overview / About, first paragraph. The source-pinned CShapes Sudan rows end the undivided geometry on 8 July and start both the reduced Sudan geometry and South Sudan on 9 July. Sudan continues as a state; this is a secession, not Sudan falling to South Sudan.

Use component fields `gwsyear/gwsmonth/gwsday` and `gweyear/gwemonth/gweday`, not the export's hour-offset timestamp strings. Keep inclusive source end dates in provenance; comparisons can use an exclusive next-day endpoint.

| Observation convention | Frame 2011 | Frame 2012 |
|---|---|---|
| 1 January | Undivided Sudan | Sudan and South Sudan |
| 31 December | Sudan and South Sudan | Sudan and South Sudan |
| Exact date | Changes on 9 July | Both states |

The [official CShapes page](https://icr.ethz.ch/data/cshapes/) explicitly says its **precomputed dyadic distances** use 1 January annually. That convention belongs to that derivative, not automatically to every polygon display. Raw polygons retain dates. No reviewed source makes 31 December the required observation day.

**Recommended product convention:** use end-of-year frames for date-resolved modern data, visibly labelled "Borders at the end of 2011". Preserve "Independence: 9 July 2011" on the card and event link. This places independence in the year visitors expect without inventing a January event. Keep old historical snapshot labels as "Source map for 3000 BCE; approximate". Never reinterpret an archaeological range or a millennial snapshot as a precisely known 31 December perimeter.

A future exact-date event URL should preserve the ISO date separately from the coarse timeline year. Annual selection and event selection must query one shared date predicate. Do not implement end-of-year labels while retaining January geometry predicates.

## Reproduced geometry findings

`inspect-sudan-neighbors.py` checks the full upstream SHA before reading and writes only here. It preserved eleven raw features: the post-split pair plus nine touching source neighbors. All nine neighbors are valid and have **zero positive-area intersection** with the pair: Egypt, Libya, Chad, Central African Republic, Democratic Republic of the Congo, Uganda, Kenya, Ethiopia and Eritrea. This establishes source-internal consistency at this seam, not adjudication of any territorial claim.

Against the existing 2010 background, eight neighboring records overlap the pair. Ellipsoidal diagnostics place the largest aggregate overlaps at approximately 10,860 square kilometres for Egypt and 5,200 for Ethiopia. These are measurements of entire source disagreements, **not** measurements or identifications of named disputed territories. Other overlaps appear along Chad, CAR, DRC, Libya, Eritrea and Uganda. The exact bounds and values are in `sudan-neighbor-qa.json`.

Replacing those nine neighbors would move the mixed-source seam outward. Do not call that a completed fix until their outer neighbors have been checked. Automatic clipping would merely give one source precedence and could silently decide a disputed border.

## Source meaning and remaining gates

The [CShapes documentation](https://icr.ethz.ch/data/cshapes/CShapes-2.0_Codebook.pdf), pages 3 to 4, describes legal territorial changes and omitted or reconstructed boundaries. Its advertised modern coverage does not imply every segment is surveyed. The inspected global export omits the manual's `status`, `ruledby` and `b_def` fields. Do not classify colonies or undefined sectors from name alone. The linked PDF is a 2018 coding-task document and has coverage dates differing from the current downloadable export; distinguish documentation version from data version.

To publish the paired transition:

1. Add and test the explicit year/date observation contract above.
2. Recover country-level source documentation and disputed-sector treatment; visible unresolved-border encoding is needed, especially for the Sudan/South Sudan boundary. UN mission pages attempted in this review returned 403, so no new dispute-specific claim was inferred from them.
3. Build one consistent modern source chunk with reviewed identity crosswalks, or implement documented source seams that do not invent sovereignty. The new neighborhood sample gives the next exact inputs.
4. Compare its handoff into 2020 Natural Earth and label a cartographic-source change separately from a historical event. Do not animate a vertex morph as territorial movement.
5. Measure simplification error and shared-edge topology, then verify source-paired changes, spherical selection and phone loading before activation.

## Territory and uncertainty display contract

These are proposed product semantics, not claims that every source supports each layer:

| Meaning | Map treatment | Card explanation |
|---|---|---|
| Source-coded state territory | Fill plus boundary; dashed where approximate | Source name, depicted date, sovereignty versus control, researched limitations |
| Cultural or language territory | Faint patterned area with soft or dashed edges | Community identity, overlap allowed, dates supported by evidence; not a legal state perimeter |
| Colonial jurisdiction | Distinct internal line, no automatic sovereign-country identity | Local jurisdiction, dated administrative form, administering power and source |
| Disputed claims | Separate claim lines or hatch with multiple claimants | Which claims are shown and source date; no automatic winner through draw order |
| Archaeological settlement or excavation | Located point or site footprint | What was excavated and dated; site footprint does not define a kingdom |
| Influence or exchange network | Routes and centers, uncertain areas only if sourced | Nature of relationship; no inference of annexation from pottery or trade |
| Unknown extent | No invented fill | "Territorial extent is not yet mapped from a dated source"; keep the civilization discoverable |

Keep **date precision**, **boundary precision** and **political meaning** separate. A well-dated conquest may have an uncertain perimeter. An accurately surveyed site can have a broad occupation range. The present numeric `precision` field alone cannot express both.

## Reproduce

```bash
python -m pip install shapely pyproj
python data/research/border-integration-next/inspect-sudan-neighbors.py /path/to/CShapes-2.0.geojson
```

Upstream: `https://icr.ethz.ch/data/cshapes/CShapes-2.0.geojson`.
Required SHA-256: `384b1ea90b9419f30a858d7ec237c85a22c60d1b35b5f85f215a1204f9989d42`.
The staged GeoJSON deliberately retains full source precision and attributes for review. It is not a runtime file or a simplification recommendation.
