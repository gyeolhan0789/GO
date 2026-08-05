import type { BingoBoardSize } from '../../bingo/components/BingoBoard/BingoBoard';
import type {
  WalkSessionBingoBoardResponse,
  WalkSessionDetailResponse,
  WalkSessionResponse,
} from '../../walk-session/api/walkSessionApi';
import type {
  WalkBingoBoard,
  WalkDetail,
  WalkRecord,
} from '../types';

const BINGO_SIZES: BingoBoardSize[] = [3, 4, 5];
const DEFAULT_BINGO_SIZE: BingoBoardSize = 3;

function toBingoSize(boardSize: number): BingoBoardSize {
  return BINGO_SIZES.find(size => size === boardSize) ?? DEFAULT_BINGO_SIZE;
}

export function toWalkRecord(response: WalkSessionResponse): WalkRecord {
  return {
    walkSessionId: response.walkSessionId,
    roomId: response.roomId,
    title: response.roomName,
    mode: response.mode,
    startedAt: response.startedAt,
    endedAt: response.endedAt,
    durationSeconds: response.durationSeconds,
    activeDurationSeconds: response.activeDurationSeconds,
    step: response.step,
    distanceMeters: response.distance,
    calories: response.calories,
    achievedMissionCount: response.achievedMissionCount,
  };
}

function toBingoBoard(board: WalkSessionBingoBoardResponse): WalkBingoBoard {
  const size = toBingoSize(board.boardSize);

  return {
    bingoBoardId: board.bingoBoardId,
    size,
    cells: board.cells.map(cell => ({
      // 서버가 row, col 순으로 정렬해 주지만 순서에 기대지 않고 자리를 직접 센다.
      index: cell.row * size + cell.col,
      missionTitle: cell.mission.title,
      achievedInSession: cell.achievedInSession,
      // 이미 승인된 칸이지만 이번 산책의 몫은 아니다. 사진을 냈어도 승인 전이거나
      // 반려됐으면 그 칸은 아직 비어 있다.
      completedBefore:
        !cell.achievedInSession && cell.verificationStatus === 'APPROVED',
      achievedAt: cell.achievedInSession ? cell.achievedAt : null,
    })),
  };
}

export function toWalkDetail(response: WalkSessionDetailResponse): WalkDetail {
  return {
    ...toWalkRecord(response),
    bingoBoards: response.bingoBoards.map(toBingoBoard),
  };
}
