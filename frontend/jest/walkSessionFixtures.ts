/**
 * 산책 기록 화면이 붙는 GET /walk-sessions 응답 목업. 여러 테스트가 같은 모양을
 * 봐야 해서 한곳에 모아둔다.
 */

import type {
  WalkSessionBingoCellResponse,
  WalkSessionDetailResponse,
  WalkSessionResponse,
  WalkSessionSlice,
} from '../src/features/walk-session/api/walkSessionApi';

export const MY_MEMBER_ID = 1;

export const MY_CHARACTER_RESPONSE = {
  memberId: MY_MEMBER_ID,
  nickname: '걷는곰',
  gender: 'MALE',
  defaultImageUrl: null,
  equippedItems: [],
};

const TITLES = [
  '민서와의 산책',
  '아침 조깅 클럽',
  '혼자 걷는 시간',
  'SSAFY 팀 산책',
  '동네 한바퀴',
];

const BOARD_SIZE = 3;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
/** 시작~종료 32분 중 4분을 쉬었다. 두 시간이 다르게 쓰이는지 보려고 벌려 둔다. */
const DURATION_SECONDS = 1_920;
const ACTIVE_DURATION_SECONDS = 1_680;

/** index 0이 가장 최근. index만 보고 값을 정해 같은 자리엔 늘 같은 산책이 온다. */
export function buildWalkSessionResponse(index: number): WalkSessionResponse {
  const day = String(20 - (index % 20)).padStart(2, '0');

  return {
    walkSessionId: index + 1,
    // 한 방에서 여러 번 걸을 수 있어 두 값은 절대 같지 않다. 같은 숫자로 두면
    // 상세를 방 번호로 조회하는 버그가 테스트를 그냥 통과한다.
    roomId: 4000 + index,
    roomName: TITLES[index % TITLES.length],
    mode: index % 3 === 0 ? 'SINGLE' : 'COOPERATE',
    // 서버는 Instant를 UTC로 준다. KST로 옮기면 20:00에 시작한 산책이다.
    startedAt: `2026-07-${day}T11:00:00Z`,
    endedAt: `2026-07-${day}T11:32:00Z`,
    durationSeconds: DURATION_SECONDS,
    activeDurationSeconds: ACTIVE_DURATION_SECONDS,
    step: 3_240,
    distance: 2_400,
    calories: 118,
    initialBingoBoardId: 900 + index,
    achievedMissionCount: 2,
  };
}

export function buildWalkSessionSlice(
  page: number,
  size: number,
  total: number,
): WalkSessionSlice {
  const start = page * size;
  const content = Array.from(
    { length: Math.max(0, Math.min(size, total - start)) },
    (_, offset) => buildWalkSessionResponse(start + offset),
  );

  return { content, hasNext: start + content.length < total };
}

/** 이번 산책에 깬 칸. */
const ACHIEVED_IN_SESSION = [0, 3];
/** 승인은 됐지만 지난 산책의 몫인 칸. */
const APPROVED_BEFORE = [1, 8];

function buildCells(): WalkSessionBingoCellResponse[] {
  return Array.from({ length: CELL_COUNT }, (_, index) => {
    const achievedInSession = ACHIEVED_IN_SESSION.includes(index);
    const approved = achievedInSession || APPROVED_BEFORE.includes(index);

    return {
      cellId: index + 1,
      row: Math.floor(index / BOARD_SIZE),
      col: index % BOARD_SIZE,
      mission: { missionId: index + 1, title: `미션 ${index + 1}` },
      verificationStatus: approved ? ('APPROVED' as const) : null,
      submittedByMemberId: approved ? MY_MEMBER_ID : null,
      achievedInSession,
      achievedAt: achievedInSession ? '2026-07-20T11:10:00Z' : null,
    };
  });
}

export function buildWalkSessionDetailResponse(
  walkSessionId: number,
): WalkSessionDetailResponse {
  return {
    ...buildWalkSessionResponse(0),
    walkSessionId,
    mode: 'COOPERATE',
    bingoBoards: [
      {
        bingoBoardId: 900,
        boardType: 'SHARED',
        boardSize: BOARD_SIZE,
        cells: buildCells(),
      },
    ],
  };
}
