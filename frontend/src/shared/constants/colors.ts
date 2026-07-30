export const colors = {
  primary: '#27A34A',
  ink: '#111827',
  surface: '#FFFEFB',
  successBg: '#E8F5E9',
  successText: '#2C6A47',
  // Eyeballed from screenshots; swap for the exact hex once designer confirms.
  highlightBg: '#FBC02D',
  neutralBg: '#EFEAD9',
  danger: '#B3261E',
  dangerBg: '#FDE7E7',
  muted: '#9CA3AF',
  // muted 위의 흰 글씨는 대비 2.3:1로 안 읽힌다. 흰 글씨를 얹는 회색 면에는
  // 이 값을 쓴다(흰색 대비 4.8:1로 WCAG AA 통과).
  mutedStrong: '#6B7280',
  infoBg: '#E3EDF7',
  infoText: '#2E5A8C',
  progress: '#e1e2e4',
  // highlightBg는 채도가 높아 넓은 면에 깔면 눈이 아프다. 빙고 칸처럼 면으로
  // 칠하고 그 위에 아이콘을 얹는 자리에는 이 옅은 짝을 쓴다(대비 5.9:1).
  highlightSoftBg: '#FDF0D9',
  highlightText: '#B26A00',
  // primary보다 밝고 부드러운 초록 계열. 상점의 카테고리 탭/구매 버튼처럼
  // 카드 위에 여러 개가 나란히 놓이는 면적 큰 요소에 쓴다.
  primarySoft: '#7FC46E',
  primarySoftLight: '#9BD68C',
  primarySoftDark: '#63AC55',
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
