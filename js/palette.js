// Each polity gets a stable colour: the one its data entry names, or one
// hashed from its id so a kingdom keeps its colour across sessions, files and
// pages without anyone having to assign it. The palette is deliberately
// muted; the fills are washes over paper and need to stay apart from the ink
// and from each other, and none of them is orange, by Amy's rule.

export const PALETTE = [
  '#8fa3c7', '#c4606a', '#7fa66a', '#5f9ec9', '#b07dc4', '#d8c15a',
  '#6bbcb0', '#d98fb0', '#9c8f6a', '#9fb3a0', '#8ea3d9', '#a4c66a',
  '#6aa3a8', '#6f9fb0', '#c1a2e6', '#b8b26f', '#e6a0a0', '#7cb7a4',
  '#c9a0b8', '#9fb6c7',
];

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function colorFor(civ) {
  if (civ && civ.color) return civ.color;
  const id = civ && civ.id ? civ.id : '';
  return PALETTE[hash(id) % PALETTE.length];
}

export function withAlpha(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// the colour mixed toward white by `amount` (0 keeps it, 1 is white): a
// wash of it on paper, once multiplied with the sheet
export function tint(hex, amount) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

// black or white text, whichever reads on this colour (used for the swatch
// chips on the tooltip and card page)
export function inkOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#000';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#141312' : '#f5f1e8';
}
