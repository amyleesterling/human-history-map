// The time axis. Years are plain integers: negative is BCE, positive is CE,
// and there is no year zero (the year before 1 CE is -1, shown as 1 BCE).
// That is the astronomical convention minus the zero, chosen because it is
// what a historian writing "550 BCE" means, and it keeps the data files
// readable: -550 is 550 BCE, full stop.

// Consecutive clock positions skip the nonexistent historical year zero.
export const yearToTick = year => year < 0 ? year + 1 : year;
export const tickToYear = tick => tick <= 0 ? tick - 1 : tick;
export const normalizeYear = year => Math.round(year) || 1;
export const advanceYear = (year, amount) => tickToYear(yearToTick(normalizeYear(year)) + amount);

// Years never take a thousands separator: "3500 BCE", not "3,500 BCE".
export function formatYear(year) {
  const y = Math.round(year);
  if (y <= 0) return `${y === 0 ? 1 : -y} BCE`;
  return `${y} CE`;
}

// "27 BCE to 476 CE", "1299 to 1922 CE", "2686 to 2181 BCE", "2020 CE to present";
// with circa (dates that are only as fine as the source's snapshots): "c. 1000 to 1100 CE"
export function formatSpan(from, to, { circa = false } = {}) {
  const c = circa ? 'c. ' : '';
  if (to == null) return `${c}${formatYear(from)} to present`;
  const a = formatYear(from), b = formatYear(to);
  if (from > 0 && to > 0) return `${c}${from} to ${b}`;
  if (from <= 0 && to <= 0) return `${c}${from === 0 ? 1 : -from} to ${b}`;
  return `${c}${a} to ${b}`;
}

// A society's first and last imported map appearances are not its founding
// and fall. Reviewed historical dates can explicitly replace that basis.
export function formatCivSpan(civ) {
  const importedCoverage = !!civ.circa ||
    String(civ.generated || '').startsWith('natural-earth');
  const coverage = civ.dateBasis === 'map_coverage' ||
    (civ.dateBasis !== 'historical' && importedCoverage);
  const span = formatSpan(civ.from, civ.to, { circa: !!civ.circa });
  return coverage ? `Map coverage: ${span}` : span;
}

// Recorded history is lopsided: three thousand years of a handful of river
// kingdoms, then a crowded last millennium. A linear slider would spend most
// of its length on the empty part, so the axis is piecewise linear through a
// list of anchors [year, position 0..1] set in the manifest. Between anchors
// the slider moves at a constant years-per-pixel; across them the rate
// changes. toT and toYear are exact inverses.
export class TimeScale {
  constructor(start, end, anchors) {
    this.start = start;
    this.end = end;
    const a = (anchors && anchors.length >= 2 ? anchors : [[start, 0], [end, 1]])
      .map(([y, t]) => [y, t]).sort((p, q) => p[0] - q[0]);
    // clamp the anchor list to the timeline and pin the ends to 0 and 1
    a[0] = [start, 0];
    a[a.length - 1] = [end, 1];
    this.anchors = a;
  }

  toT(year) {
    const a = this.anchors;
    if (year <= a[0][0]) return 0;
    if (year >= a[a.length - 1][0]) return 1;
    for (let i = 1; i < a.length; i++) {
      if (year <= a[i][0]) {
        const [y0, t0] = a[i - 1], [y1, t1] = a[i];
        return t0 + ((year - y0) / (y1 - y0)) * (t1 - t0);
      }
    }
    return 1;
  }

  toYear(t) {
    const a = this.anchors;
    if (t <= 0) return a[0][0];
    if (t >= 1) return a[a.length - 1][0];
    for (let i = 1; i < a.length; i++) {
      if (t <= a[i][1]) {
        const [y0, t0] = a[i - 1], [y1, t1] = a[i];
        return y0 + ((t - t0) / (t1 - t0)) * (y1 - y0);
      }
    }
    return a[a.length - 1][0];
  }

  clamp(year) {
    return Math.min(this.end, Math.max(this.start, year));
  }
}

// Sensible tick years when the manifest does not list any: round numbers,
// denser where the scale is stretched.
export function defaultTicks(start, end) {
  const out = [];
  for (let y = Math.ceil(start / 1000) * 1000; y < 0; y += 1000) out.push(y);
  out.push(1);
  for (let y = 500; y <= end; y += 500) out.push(y);
  return out.filter((y) => y >= start && y <= end);
}
