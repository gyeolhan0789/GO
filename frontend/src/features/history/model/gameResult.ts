import type { BingoBoardSize } from '../../bingo/components/BingoBoard/BingoBoard';
import type { GameMode } from '../../room/api/roomApi';
import type {
  GameResultBingoBoardResponse,
  GameResultDetailResponse,
  GameResultResponse,
} from '../api/gameResultApi';
import type {
  WalkBingoCell,
  WalkDetail,
  WalkDetailParticipant,
  WalkRecord,
} from '../types';

const BINGO_SIZES: BingoBoardSize[] = [3, 4, 5];
const DEFAULT_BINGO_SIZE: BingoBoardSize = 3;

export const GAME_MODE_LABEL: Record<GameMode, string> = {
  SINGLE: '혼자',
  COOPERATE: '협동',
  BATTLE: '대결',
};

/** 대결만 상대가 있어 승패로 읽힌다. 나머지는 목표를 채웠는지가 전부다. */
export function formatWalkResult(mode: GameMode, isWin: boolean): string {
  if (mode === 'BATTLE') {
    return isWin ? '승리' : '패배';
  }
  return isWin ? '성공' : '실패';
}

function toBingoSize(boardSize: number): BingoBoardSize {
  return BINGO_SIZES.find(size => size === boardSize) ?? DEFAULT_BINGO_SIZE;
}

/** 대결에는 myResult가, 협동·혼자에는 게임 전체 결과만 있다. */
function resolveIsWin(response: GameResultResponse): boolean {
  return response.myResult ?? response.result;
}

export function toWalkRecord(response: GameResultResponse): WalkRecord {
  return {
    roomId: response.roomId,
    title: response.roomName,
    mode: response.mode,
    startedAt: response.startedAt,
    completedAt: response.completedAt,
    myCompletedMissionCount: response.myCompletedMissionCount,
    // totalMissionCount는 모든 판을 더한 값이라 대결에서는 내 몫의 분모가 아니다.
    // 한 판은 늘 boardSize x boardSize 칸이므로 그걸 쓴다.
    boardCellCount: response.boardSize * response.boardSize,
    isWin: resolveIsWin(response),
    participants: response.participants.map(participant => ({
      memberId: participant.memberId,
      nickname: participant.nickname,
    })),
  };
}

/**
 * 대결은 사람마다 판이 따로라 내 판을 골라야 한다. 협동·혼자는 참가자 전원이
 * 주인인 판 하나뿐이라 무엇을 고르든 같다.
 */
function selectMyBoard(
  boards: GameResultBingoBoardResponse[],
  myMemberId: number,
): GameResultBingoBoardResponse | null {
  const mine = boards.find(board =>
    board.owners.some(owner => owner.memberId === myMemberId),
  );

  return mine ?? boards[0] ?? null;
}

function toBingoCells(
  board: GameResultBingoBoardResponse | null,
): WalkBingoCell[] {
  if (board === null) {
    return [];
  }

  return board.cells.map(cell => ({
    // 서버가 row, col 순으로 정렬해 주지만 순서에 기대지 않고 자리를 직접 센다.
    index: cell.row * board.boardSize + cell.col,
    missionTitle: cell.mission.title,
    // 사진을 냈어도 승인 전이거나 반려됐으면 그 칸은 아직 비어 있다.
    completedBy:
      cell.verificationStatus === 'APPROVED' ? cell.submittedByMemberId : null,
  }));
}

/** 본인을 맨 앞으로. 나머지는 서버가 준 순서를 지킨다. */
function toDetailParticipants(
  response: GameResultDetailResponse,
  myMemberId: number,
): WalkDetailParticipant[] {
  const participants = response.participants.map(participant => ({
    memberId: participant.memberId,
    nickname: participant.nickname,
    isMe: participant.memberId === myMemberId,
    completedMissionCount: participant.completedMissionCount,
  }));

  return [
    ...participants.filter(participant => participant.isMe),
    ...participants.filter(participant => !participant.isMe),
  ];
}

export function toWalkDetail(
  response: GameResultDetailResponse,
  myMemberId: number,
): WalkDetail {
  const board = selectMyBoard(response.bingoBoards, myMemberId);

  return {
    roomId: response.roomId,
    title: response.roomName,
    mode: response.mode,
    startedAt: response.startedAt,
    completedAt: response.completedAt,
    isWin: resolveIsWin(response),
    participants: toDetailParticipants(response, myMemberId),
    bingoSize: toBingoSize(board?.boardSize ?? response.boardSize),
    bingoCells: toBingoCells(board),
  };
}
