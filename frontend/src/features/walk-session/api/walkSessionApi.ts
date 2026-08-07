import { apiClient } from '../../../shared/api/client';
import type { BingoCellVerificationStatus } from '../../bingo/api/bingoApi';
import type { GameMode } from '../../room/api/roomApi';

/**
 * 산책 세션 API. 백엔드에서는 history 패키지에 있지만, 프론트에서는 진행 중인
 * 세션과 그 결과인 기록이 walkSessionKey 하나로 이어져 있어 여기에 모아둔다.
 * 날짜별 합계인 /histories는 features/history가 계속 맡는다.
 */

/** 시간대가 붙은 ISO-8601. 서버는 Instant를 UTC('...Z')로 내려준다. */
type InstantString = string;

export type WalkSessionStartRequest = {
  roomId: number;
  /** 이 산책을 시작한 빙고판. 없으면 서버가 판을 특정하지 않는다. */
  bingoBoardId?: number;
};

export type WalkSessionStartResponse = {
  walkSessionKey: string;
  roomId: number;
  roomName: string;
  mode: GameMode;
  initialBingoBoardId: number | null;
  startedAt: InstantString;
  expiresAt: InstantString;
};

/**
 * 회원당 활성 세션은 하나뿐이다. 이미 있으면 서버는 요청한 roomId를 보지도 않고
 * 기존 세션을 그대로 돌려준다 — 응답의 roomId가 요청과 같은지 호출부가 반드시
 * 확인해야 한다. 세션을 버리는 엔드포인트는 없고, 24시간이 지나야 만료된다.
 */
export function startWalkSessionOnServer(body: WalkSessionStartRequest) {
  return apiClient.post<WalkSessionStartResponse>('/walk-sessions/start', body);
}

export type WalkSessionCompleteRequest = {
  walkSessionKey: string;
  /** walkSessionKey와 같은 값. 서버가 walkSessionKey ?? clientSessionKey로 푼다. */
  clientSessionKey: string;
  roomId: number;
  /** 이 산책이 시작한 빙고판. 판을 못 읽고 시작했으면 없다. */
  bingoBoardId?: number | null;
  /** 서버가 세션을 열며 찍은 시각. 기기 시계로 다시 만들지 않는다. */
  startedAt?: string;
  /** 오프셋이 붙은 ISO-8601. Date의 toISOString()이 그대로 맞는다. */
  endedAt: string;
  /**
   * 일시정지를 뺀 실제 운동 시간. 서버는 이 값이 (종료 - 시작)보다 크면 400을
   * 내므로 초로 바꿀 때 올림하면 안 된다.
   */
  activeDurationSeconds: number;
  step: number;
  /** 미터. */
  distance: number;
  calories: number;
};

export type WalkSessionResponse = {
  walkSessionId: number;
  roomId: number;
  roomName: string;
  mode: GameMode;
  startedAt: InstantString;
  endedAt: InstantString;
  /** 시작부터 종료까지. 일시정지 시간이 들어 있다. */
  durationSeconds: number;
  /** 일시정지를 뺀 실제 운동 시간. 화면에 보여주는 건 이쪽이다. */
  activeDurationSeconds: number;
  step: number;
  /** 미터. */
  distance: number;
  calories: number;
  initialBingoBoardId: number | null;
  achievedMissionCount: number;
};

export type WalkSessionCompleteResponse = WalkSessionResponse & {
  /**
   * 이 산책 동안 받은 포인트 합계. 서버가 미션 인증·걸음 목표·게임 보상을
   * 전부 합쳐 내려준다 — 걸음 목표 보상 단독이 아니므로 목표 달성 여부의
   * 신호로 쓰면 안 된다.
   *
   * 같은 키로 다시 보내 기존 기록이 돌아온 경우에는 0이다 — 처음 받은 보상이
   * 얼마였는지는 서버가 다시 알려주지 않는다.
   */
  earnedPoint: number;
};

/**
 * 산책을 끝내고 기록으로 확정한다. 서버가 이 안에서 그날 걸음 합계(/histories와
 * 같은 자리)까지 누적하므로, 이 요청이 성공했으면 /histories를 따로 부르면
 * 안 된다 — 같은 걸음이 두 번 더해진다.
 *
 * 같은 walkSessionKey로 다시 보내면 새로 만들지 않고 기존 기록을 돌려준다.
 */
export function completeWalkSession(body: WalkSessionCompleteRequest) {
  return apiClient.post<WalkSessionCompleteResponse>('/walk-sessions', body);
}

export type WalkSessionSlice = {
  content: WalkSessionResponse[];
  hasNext: boolean;
};

export type GetWalkSessionsParams = {
  page: number;
  size: number;
};

/** 항상 종료 시각 최신순이다 — 서버가 정렬 조건을 받지 않는다. */
export function getWalkSessions({ page, size }: GetWalkSessionsParams) {
  return apiClient.get<WalkSessionSlice>(
    `/walk-sessions?page=${page}&size=${size}`,
  );
}

export type WalkSessionBingoCellResponse = {
  cellId: number;
  row: number;
  col: number;
  /** 기록 화면은 제목만 쓴다. 미션의 나머지 필드는 그릴 자리가 없다. */
  mission: { missionId: number; title: string };
  /** 아무도 손대지 않은 칸은 null이다(제출할 때 비로소 값이 붙는다). */
  verificationStatus: BingoCellVerificationStatus | null;
  submittedByMemberId: number | null;
  /** 이 산책 중에 깬 칸인지. 지난 산책에서 이미 승인된 칸과 구분한다. */
  achievedInSession: boolean;
  achievedAt: InstantString | null;
};

export type WalkSessionBingoBoardResponse = {
  bingoBoardId: number;
  /** PERSONAL은 칸이 전부 내 것이라 누가 깼는지 따질 필요가 없다. */
  boardType: 'SHARED' | 'PERSONAL';
  boardSize: number;
  cells: WalkSessionBingoCellResponse[];
};

/**
 * 판이 여럿일 수 있다 — 산책 도중 빙고판을 갱신하면 시작한 판과 미션을 깬 판이
 * 달라진다. 미션을 하나도 못 깼고 시작 판도 없으면 빈 배열이다.
 */
export type WalkSessionDetailResponse = WalkSessionResponse & {
  bingoBoards: WalkSessionBingoBoardResponse[];
};

export function getWalkSession(walkSessionId: number) {
  return apiClient.get<WalkSessionDetailResponse>(
    `/walk-sessions/${walkSessionId}`,
  );
}
