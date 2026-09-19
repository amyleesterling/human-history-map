// Each polity gets a stable colour: the one its data entry names, or one
// hashed from its id so a kingdom keeps its colour across sessions, files and
// pages without anyone having to assign it. The palette is deliberately
// muted; the fills sit at half opacity over dark land and need to stay apart
// from the ocean blue and the parchment text.

export const PALETTE = [
  '#e0a458', '#c96a5b', '#7fa66a', '#5f9ec9', '#b07dc4', '#d8c15a',
  '#6bbcb0', '#d98fb0', '#9c8f6a', '#e28a4c', '#8ea3d9', '#a4c66a',
  '#c9806a', '#6f9fb0', '#c1a2e6', '#b8b26f', '#e6a0a0', '#7cb7a4',
  '#d9b07a', '#9fb6c7',
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

// black or white text, whichever reads on this colour (used for the swatch
// chips on the tooltip and card page)
export function inkOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#000';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#141312' : '#f5f1e8';
}
