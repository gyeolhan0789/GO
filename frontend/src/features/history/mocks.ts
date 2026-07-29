import { parseIsoDate, toIsoDate } from './model/period';
import { selectWalks } from './model/walkList';
import type {
  RecentWalk,
  WalkBingoCell,
  WalkDateRange,
  WalkDetail,
  WalkFilter,
  WalkPage,
  WalkSort,
} from './types';

// 걸음/거리/칼로리는 삼성헬스에서 읽는다. 여기는 출처가 없는 산책 단위 기록.

const MY_MEMBER_ID = 101;

// 최근 목록과 전체 목록이 어긋나지 않게 생성기 하나로 만든다.
const MOCK_WALK_TOTAL = 27;
const MOCK_WALK_BASE_DATE = '2026-07-20';

const MOCK_WALK_TITLES = [
  '민서와의 산책',
  '아침 조깅 클럽',
  '혼자 걷는 시간',
  'SSAFY 팀 산책',
  '동네 한바퀴',
  '저녁 산책 모임',
  '강아지랑 산책',
  '점심 산책',
];

const MOCK_FRIENDS = [
  { memberId: 102, nickname: '민서' },
  { memberId: 103, nickname: '지호' },
  { memberId: 104, nickname: '수아' },
  { memberId: 105, nickname: '태윤' },
  { memberId: 106, nickname: '하은' },
];

const MOCK_WALK_HOURS = [20, 7, 21, 12, 18];
// index 0은 상세 화면 목업(4,231걸음 / 12분 31초)에 맞춘다.
const STEP_BASELINE = 4_231;
const STEP_STRIDE = 617;
const STEP_SPREAD = 5_000;
const SECONDS_PER_STEP = 0.1775;

/** index 0이 가장 최근. index만 보고 값을 정해 같은 자리엔 늘 같은 산책이 나온다. */
function buildMockWalk(index: number): RecentWalk {
  const startedDate = parseIsoDate(MOCK_WALK_BASE_DATE);
  startedDate.setDate(startedDate.getDate() - index);

  const hour = MOCK_WALK_HOURS[index % MOCK_WALK_HOURS.length];
  const step = STEP_BASELINE + ((index * STEP_STRIDE) % STEP_SPREAD);
  // 아바타가 한 명일 때와 여럿일 때를 다 보게 1~3명을 돈다.
  const friendCount = index % 3;

  return {
    walkId: index + 1,
    title: MOCK_WALK_TITLES[index % MOCK_WALK_TITLES.length],
    startedAt: `${toIsoDate(startedDate)}T${`${hour}`.padStart(2, '0')}:00:00`,
    step,
    durationSeconds: Math.round(step * SECONDS_PER_STEP),
    participants: [
      { memberId: MY_MEMBER_ID, nickname: '걷는곰' },
      ...MOCK_FRIENDS.slice(0, friendCount),
    ],
  };
}

/** TODO: 산책 단위 기록 API가 아직 없다(./types.ts의 RecentWalk 참고). */
export function buildMockRecentWalks(limit: number): RecentWalk[] {
  return Array.from({ length: Math.min(limit, MOCK_WALK_TOTAL) }, (_, index) =>
    buildMockWalk(index),
  );
}

function buildAllMockWalks(): RecentWalk[] {
  return Array.from({ length: MOCK_WALK_TOTAL }, (_, index) =>
    buildMockWalk(index),
  );
}

/**
 * 필터·정렬을 페이지 자르기 전에 적용한다(selectWalks 주석 참고).
 * 응답 형태(content/hasNext)는 백엔드 SliceResponse와 맞춰뒀다.
 */
export function buildMockWalkPage(
  page: number,
  size: number,
  filter: WalkFilter,
  sort: WalkSort,
  dateRange: WalkDateRange | null,
): WalkPage {
  const selected = selectWalks(
    buildAllMockWalks(),
    filter,
    sort,
    dateRange,
  );
  const start = page * size;
  const content = selected.slice(start, start + size);

  return { content, hasNext: start + content.length < selected.length };
}

// 3x3 판. completedBy가 null이면 아무도 못 한 칸이다.
const MOCK_BINGO_CELLS: WalkBingoCell[] = [
  { index: 0, missionTitle: '파란 물건 찾기', completedBy: MY_MEMBER_ID },
  { index: 1, missionTitle: '고양이 만나기', completedBy: 102 },
  { index: 2, missionTitle: '벤치에서 쉬기', completedBy: null },
  { index: 3, missionTitle: '꽃 사진 찍기', completedBy: MY_MEMBER_ID },
  { index: 4, missionTitle: '계단 오르기', completedBy: null },
  { index: 5, missionTitle: '편의점 지나기', completedBy: 110 },
  { index: 6, missionTitle: '빨간 간판 찾기', completedBy: null },
  { index: 7, missionTitle: '나무 세 그루 세기', completedBy: MY_MEMBER_ID },
  { index: 8, missionTitle: '횡단보도 건너기', completedBy: MY_MEMBER_ID },
];

/**
 * TODO: 산책 단위 기록 API가 아직 없다(./types.ts의 WalkDetail 참고).
 * 지금은 walkId와 무관하게 같은 산책을 돌려준다.
 */
export function buildMockWalkDetail(walkId: number): WalkDetail {
  return {
    walkId,
    title: '민서와의 산책',
    startedAt: '2026-07-20T20:00:00',
    endedAt: '2026-07-20T20:13:00',
    bingoSize: 3,
    bingoCells: MOCK_BINGO_CELLS,
    // 본인이 맨 앞.
    participants: [
      {
        memberId: MY_MEMBER_ID,
        nickname: '나',
        isMe: true,
        stats: {
          step: 4_231,
          durationSeconds: 751,
          distance: 3_200,
          calories: 176,
        },
      },
      {
        memberId: 102,
        nickname: '민서',
        isMe: false,
        stats: {
          step: 3_890,
          durationSeconds: 751,
          distance: 2_940,
          calories: 158,
        },
      },
      {
        memberId: 110,
        nickname: '민지',
        isMe: false,
        stats: {
          step: 4_602,
          durationSeconds: 751,
          distance: 3_480,
          calories: 191,
        },
      },
    ],
  };
}
