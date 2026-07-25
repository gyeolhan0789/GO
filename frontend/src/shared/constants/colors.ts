export const colors = {
  primary: '#27A34A',
  ink: '#111827',
  surface: '#FFFFFF',
  successBg: '#E8F5E9',
  successText: '#2C6A47',
  // Eyeballed from screenshots; swap for the exact hex once designer confirms.
  highlightBg: '#FBC02D',
  neutralBg: '#EFEAD9',
  danger: '#B3261E',
  dangerBg: '#FDE7E7',
  muted: '#9CA3AF',
  infoBg: '#E3EDF7',
  infoText: '#2E5A8C',
} as const;

// Per-member identity colors for shared bingo boards (who completed which
// cell). Muted to match the app's soft pastel palette rather than raw chart
// colors. Order is a CVD-safety mechanism, not cosmetic — validated with the
// dataviz skill's palette checker (worst adjacent pair CVD dE 7.3, light
// mode; within the 6-8 floor band, legal because every cell already carries
// an ink border + the board ships a color/name legend as secondary encoding).
// Hues stay outside the green/red/yellow/blue families already used above
// for status colors, so identity never impersonates status.
export const participantColors = [
  '#3DA688', // teal
  '#E08152', // coral
  '#7B6CC9', // violet
  '#D66F94', // rose
] as const;
