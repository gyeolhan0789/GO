// primary(#27A34A) 위의 흰 글씨는 대비 3.3:1이라 18px 이상 굵은 글씨(AA Large)
// 에서만 쓸 수 있다. 초록 글씨·포커스 테두리처럼 작은 글씨나 얇은 선에는 대비
// 6.5:1인 이 어두운 짝을 쓴다. 로그인·회원가입·권한·온보딩 화면의 CTA가 이걸
// 쓰고 있어서 primary와 합치면 대비가 무너진다.
const primaryDark = '#2C6A47';

export const colors = {
  primary: '#27A34A',
  primaryDark,
  ink: '#111827',
  surface: '#FFFEFB',
  successBg: '#E8F5E9',
  // 성공 상태 글씨도 같은 어두운 초록을 공유한다.
  successText: primaryDark,
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
  // 회색 계열. ink(#111827) → inkSoft → inkMuted → mutedStrong → muted 순으로
  // 옅어진다. 폼 라벨은 inkSoft, 부제목·보조 설명은 inkMuted를 쓴다.
  inkSoft: '#374151',
  inkMuted: '#4B5563',
  // 입력 필드 테두리(border)와 구분선·비활성 테두리(borderSoft).
  border: '#D1D5DB',
  borderSoft: '#E5E7EB',
} as const;

// Per-member identity colors for shared bingo boards/걸음 진행바(누가 얼마나
// 기여했는지). index 0은 항상 "나(로그인한 사람)"에게 고정 배정하고, 나머지
// 인원은 이 배열의 1번부터 순서대로 배정한다(참가자 배열 순서 그대로 쓰면
// 안 되고, 반드시 memberId로 "나"를 먼저 가려낸 뒤 나머지에 배정해야 함 —
// getParticipantColor, shared/lib/participantColor.ts 참고).
export const participantColors = [
  '#159A55', // emerald — 나
  '#D49320', // golden amber — 친구 1
  '#3F7EBB', // cornflower blue — 친구 2
  '#8B62A8', // soft plum — 친구 3
] as const;
