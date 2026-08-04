import type { BingoBoardSize } from '../bingo/components/BingoBoard/BingoBoard';
import type { GameMode } from '../room/api/roomApi';

/**
 * 목록에 한 줄로 서는 산책. GET /walk-sessions 한 건에서 화면이 쓰는 값만 남긴 것.
 *
 * 한 건은 게임 한 판이 아니라 내가 시작해서 끝낸 산책 한 번이다 — 한 판을 며칠에
 * 나눠 걸으면 여러 건이 되고, 산책 도중 빙고판을 갈면 한 건 안에 판이 여럿 들어간다.
 */
export type WalkRecord = {
  /** 상세 조회 키. */
  walkSessionId: number;
  roomId: number;
  /** 산책한 방 이름. */
  title: string;
  mode: GameMode;
  /** 시간대가 붙은 ISO-8601(UTC). 표시할 때 기기 시간대로 옮긴다. */
  startedAt: string;
  endedAt: string;
  /**
   * 일시정지를 뺀 실제 운동 시간(초). 서버가 주는 durationSeconds는 시작~종료라
   * 쉰 시간까지 들어 있어서, 화면에는 이쪽을 보여준다.
   */
  activeDurationSeconds: number;
  step: number;
  /** 미터. */
  distanceMeters: number;
  calories: number;
  /** 이 산책 중에 승인받은 미션 수. 목록에는 분모가 없다. */
  achievedMissionCount: number;
};

/** 하루 안의 시간대별 걸음. 일간 차트가 쓴다. */
export type HourlyStep = {
  /** 0~23. 그 시간대가 시작하는 시각. */
  hour: number;
  step: number;
};

/** 백엔드 SliceResponse와 같은 형태. 전체 개수 없이 다음 페이지 유무만 준다. */
export type WalkPage = {
  content: WalkRecord[];
  hasNext: boolean;
};

export type WalkBingoCell = {
  /** 판 왼쪽 위부터 0으로 시작하는 칸 번호. */
  index: number;
  missionTitle: string;
  /**
   * 이 산책 중에 깬 칸. 지난 산책에서 이미 승인된 칸(completedBefore)과 나눠야
   * 이번 산책이 뭘 했는지가 드러난다.
   */
  achievedInSession: boolean;
  /** 승인은 됐지만 이번 산책의 몫은 아닌 칸. */
  completedBefore: boolean;
};

export type WalkBingoBoard = {
  bingoBoardId: number;
  size: BingoBoardSize;
  cells: WalkBingoCell[];
};

/**
 * 산책 한 번의 기록. 걸음·거리·칼로리는 목록과 같은 값이고, 여기에 그 산책이
 * 거쳐 간 빙고판이 붙는다.
 */
export type WalkDetail = WalkRecord & {
  /** 시작한 판과 미션을 깬 판이 다를 수 있어 여럿이다. 없을 수도 있다. */
  bingoBoards: WalkBingoBoard[];
};
