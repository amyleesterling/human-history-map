// Keep a researched period distinct from a civilization-wide retrospective.
export function matchingPeriods(card, year) {
  return (card?.periods || []).filter(p => p.from <= year && (p.to == null || year < p.to));
}

export function partitionItems(items, year) {
  const groups = { earlier: [], later: [], undated: [] };
  for (const item of items || []) {
    const key = Number.isFinite(item.year) ? (item.year <= year ? 'earlier' : 'later') : 'undated';
    groups[key].push(item);
  }
  return groups;
}

export function endingFor(card, civ) {
  if (card?.ending?.text) return card.ending;
  const fall = card && Object.hasOwn(card, 'fall') ? card.fall : civ.fell;
  if (fall?.text || fall?.year || fall?.to?.length) return { ...fall, status: 'legacy' };
  return { status: 'unresearched', text: 'A sourced account of this society’s ending or continuity has not been added yet. Its last appearance on the map does not establish when or how it ended.' };
}
