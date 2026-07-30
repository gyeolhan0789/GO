/**
 * 산책 기록 화면이 붙는 GET /game-results 응답 목업. 여러 테스트가 같은 모양을
 * 봐야 해서 한곳에 모아둔다.
 */

import type {
  GameResultBingoCellResponse,
  GameResultDetailResponse,
  GameResultResponse,
  SliceResponse,
} from '../src/features/history/api/gameResultApi';

/** 캐릭터 조회가 내려주는 내 memberId와 같아야 '나'를 가려낼 수 있다. */
export const MY_MEMBER_ID = 1;

export const MY_CHARACTER_RESPONSE = {
  memberId: MY_MEMBER_ID,
  nickname: '걷는곰',
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

const FRIENDS = [
  { memberId: 102, nickname: '민서' },
  { memberId: 110, nickname: '민지' },
];

const BOARD_SIZE = 3;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

/** index 0이 가장 최근. index만 보고 값을 정해 같은 자리엔 늘 같은 산책이 온다. */
export function buildGameResultResponse(index: number): GameResultResponse {
  // 아바타가 한 명일 때와 여럿일 때를 다 보게 0~2명을 돈다.
  const friends = FRIENDS.slice(0, index % 3);

  return {
    gameId: index + 1,
    roomId: index + 1,
    roomName: TITLES[index % TITLES.length],
    mode: friends.length === 0 ? 'SINGLE' : 'COOPERATE',
    roomStatus: 'COMPLETED',
    result: true,
    boardSize: BOARD_SIZE,
    targetBingoCount: 2,
    targetStepCount: 5_000,
    bingoCount: 2,
    completedMissionCount: 6,
    rewardCash: 300,
    startedAt: `2026-07-${String(20 - (index % 20)).padStart(2, '0')}T20:00:00`,
    completedAt: `2026-07-${String(20 - (index % 20)).padStart(
      2,
      '0',
    )}T20:12:31`,
    totalMissionCount: CELL_COUNT,
    myCompletedMissionCount: 4,
    myRewardCash: 120,
    myResult: null,
    participants: [
      {
        memberId: MY_MEMBER_ID,
        nickname: '걷는곰',
        completedMissionCount: 4,
        rewardCash: 120,
        result: null,
      },
      ...friends.map(friend => ({
        ...friend,
        completedMissionCount: 1,
        rewardCash: 90,
        result: null,
      })),
    ],
  };
}

export function buildGameResultSlice(
  page: number,
  size: number,
  total: number,
): SliceResponse<GameResultResponse> {
  const start = page * size;
  const content = Array.from(
    { length: Math.max(0, Math.min(size, total - start)) },
    (_, offset) => buildGameResultResponse(start + offset),
  );

  return { content, hasNext: start + content.length < total };
}

/** 승인된 칸의 주인. 나머지 칸은 아무도 손대지 않은 상태로 둔다. */
const APPROVED_BY: Record<number, number> = {
  0: MY_MEMBER_ID,
  1: 102,
  3: MY_MEMBER_ID,
  5: 110,
  7: MY_MEMBER_ID,
  8: MY_MEMBER_ID,
};

function buildCells(): GameResultBingoCellResponse[] {
  return Array.from({ length: CELL_COUNT }, (_, index) => {
    const submittedByMemberId = APPROVED_BY[index] ?? null;

    return {
      cellId: index + 1,
      row: Math.floor(index / BOARD_SIZE),
      col: index % BOARD_SIZE,
      mission: { missionId: index + 1, title: `미션 ${index + 1}` },
      verificationStatus:
        submittedByMemberId === null
          ? ('PENDING' as const)
          : ('APPROVED' as const),
      submittedByMemberId,
    };
  });
}

/** 참가자 셋이 판 하나를 같이 쓰는 협동 산책. */
export function buildGameResultDetailResponse(
  roomId: number,
): GameResultDetailResponse {
  return {
    ...buildGameResultResponse(0),
    roomId,
    mode: 'COOPERATE',
    participants: [
      {
        memberId: 102,
        nickname: '민서',
        completedMissionCount: 1,
        rewardCash: 90,
        result: null,
      },
      {
        memberId: MY_MEMBER_ID,
        nickname: '걷는곰',
        completedMissionCount: 4,
        rewardCash: 120,
        result: null,
      },
      {
        memberId: 110,
        nickname: '민지',
        completedMissionCount: 1,
        rewardCash: 90,
        result: null,
      },
    ],
    bingoBoards: [
      {
        bingoBoardId: 1,
        owners: [
          { memberId: MY_MEMBER_ID, nickname: '걷는곰' },
          { memberId: 102, nickname: '민서' },
          { memberId: 110, nickname: '민지' },
        ],
        boardSize: BOARD_SIZE,
        totalCellCount: CELL_COUNT,
        approvedCellCount: Object.keys(APPROVED_BY).length,
        cells: buildCells(),
      },
    ],
  };
}
