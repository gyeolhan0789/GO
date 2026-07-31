// 서체는 두 가지 역할로만 나눈다.
//
// - fontFamily(Galmuri11): 픽셀 아트 정체성을 담당하는 디스플레이 서체.
//   화면 헤더(Header 컴포넌트)와 버튼 라벨·뱃지·수치처럼 짧고 큰 글자에만 쓴다.
//   비트맵 픽셀 폰트라 길게 읽는 문단에 쓰면 가독성이 떨어진다.
// - bodyFont(NotoSansKR): 본문 서체. 헤더 아래로 내려오는 설명·라벨·값·
//   캡션은 전부 이쪽을 쓴다.
//
// 새 화면을 만들 때 폰트 이름을 문자열로 직접 적지 말고 이 토큰을 쓴다.
export const fontFamily = {
  regular: 'Galmuri11',
  bold: 'Galmuri11-Bold',
  condensed: 'Galmuri11-Condensed',
} as const;

// 굵기는 파일별로 따로 등록된다(android/app/src/main/assets/fonts). RN 안드로이드는
// fontFamily 값을 파일 이름으로 찾으므로 여기 값이 곧 파일명이어야 한다.
//
// 그래서 fontWeight는 절대 같이 쓰지 않는다. 굵기 파일을 지정한 뒤 fontWeight까지
// 주면 안드로이드가 그 위에 합성 굵기(fake bold)를 덧씌워 글자 폭과 메트릭이
// 틀어진다. 굵기는 오직 이 토큰으로만 고른다.
//
// 번들된 굵기는 이 셋뿐이다. SemiBold는 프로젝트에 파일이 없다.
export const bodyFont = {
  regular: 'NotoSansKR-Regular',
  medium: 'NotoSansKR-Medium',
  bold: 'NotoSansKR-Bold',
} as const;

// fontSize를 적으면 lineHeight도 반드시 이 표에서 같이 가져온다.
//
// lineHeight를 비워두면 RN이 서체 고유 행간으로 대신 채운다. 그런데 비트맵
// 픽셀 서체인 Galmuri11과 아웃라인 서체인 NotoSansKR은 기본 행간이 꽤 달라서,
// 같은 fontSize여도 글자 블록 높이가 서체마다 달라진다. 그래서 줄 간격을
// 비워두면 카드 높이와 세로 정렬이 화면마다 어긋난다.
//
// 표에 없는 크기를 쓰면 타입 에러가 난다. 새 크기가 정말 필요하면 눈대중으로
// 넣지 말고 여기에 먼저 추가해서 척도를 유지한다. 글자가 커질수록 배수를
// 조금씩 좁힌다(작은 글자 1.5배 -> 큰 글자 1.27배).
export const lineHeights = {
  10: 14,
  11: 16,
  12: 18,
  13: 18,
  14: 20,
  15: 22,
  16: 24,
  17: 24,
  18: 26,
  20: 28,
  24: 32,
  26: 34,
  28: 36,
  30: 38,
} as const;

// 시스템 글꼴 크기 확대의 상한.
//
// 확대 자체를 끄면(allowFontScaling={false}) 글씨를 키워 쓰는 사용자가 앱을
// 아예 못 읽게 된다. 그렇다고 상한이 없으면 높이가 고정된 요소에서 글자가
// 잘린다. 앱에서 가장 빡빡한 곳은 상점 카드의 가격 버튼으로, 높이 36에
// lineHeight 20이라 1.8배까지만 버틴다. 여유를 두고 1.3배로 묶는다.
//
// 고정 높이를 minHeight로 바꿔 늘어나게 하는 게 더 낫지만 레이아웃 변경이
// 커서, 우선 상한으로 잘림만 막는다.
export const MAX_FONT_SCALE = 1.3;

export const textStyles = {
  // 디스플레이 — Galmuri11.
  // 화면 제목은 Header 컴포넌트가 이 스타일 하나로 그린다. 화면마다 제목 크기를
  // 따로 정하면(기록 28 / 랭킹 20 / 상점 24처럼) 탭을 옮길 때마다 제목이 들쭉날쭉해진다.
  pageTitle: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 32 },
  heading1: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 36 },
  // 바텀시트 제목·화면 안 섹션 제목용. 화면 제목보다 한 단계 작다.
  heading2: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 28 },
  // 본문 — NotoSansKR.
  body: { fontFamily: bodyFont.regular, fontSize: 16, lineHeight: 24 },
  bodyBold: { fontFamily: bodyFont.bold, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: bodyFont.regular, fontSize: 13, lineHeight: 18 },
} as const;
