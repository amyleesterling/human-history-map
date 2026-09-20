// Several snapshot IDs can describe one subject. Sharing prose must be explicit,
// and every declared destination must actually load the same file.
export const cardPathFor = (civ, pattern = 'cards/{id}.json') =>
  civ.card || pattern.replace('{id}', civ.id);

export function cardAssociationErrors(card, civ, civs, pattern = 'cards/{id}.json') {
  const errors = [];
  const ids = card.appliesTo;
  const shared = Array.isArray(ids) && ids.length >= 2 &&
    ids.every(id => typeof id === 'string') && new Set(ids).size === ids.length;
  if (ids != null) {
    if (!shared) errors.push('appliesTo must contain at least two distinct polity IDs');
    else {
      if (!card.id || !ids.includes(card.id)) errors.push('appliesTo must include the card’s primary ID');
      if (!ids.includes(civ.id)) errors.push(`appliesTo does not include ${civ.id}`);
      for (const id of ids) {
        const destination = civs.get(id);
        if (!destination) errors.push(`appliesTo names unknown polity ${id}`);
        else if (cardPathFor(destination, pattern) !== cardPathFor(civ, pattern)) {
          errors.push(`appliesTo destination ${id} does not load this card`);
        }
      }
    }
  }
  if (card.id && card.id !== civ.id && !(shared && ids.includes(civ.id))) {
    errors.push(`id "${card.id}" does not match the file’s polity ${civ.id}`);
  }
  return errors;
}
