import type { GameMode } from '../room/api/roomApi';

/** 산책에 함께한 사람. 백엔드가 캐릭터 이미지를 주지 않아 아바타는 빈 자리로 그린다. */
export type WalkParticipant = {
  memberId: number;
  nickname: string;
};

/**
 * 목록에 한 줄로 서는 산책. GET /game-results 한 건에서 화면이 쓰는 값만 남긴 것.
 * 걸음·거리·칼로리는 산책 단위로 남는 데가 없어(삼성헬스는 날짜별 합계만 준다)
 * 게임 지표로 대신 보여준다.
 */
export type WalkRecord = {
  /**
   * 상세 조회 키. 산책 한 건은 방 하나에서 끝난 게임 한 판이다. 방은 판을
   * 여러 번 돌리므로 방이 아니라 판을 가리켜야 한 건이 특정된다.
   */
  gameId: number;
  title: string;
  mode: GameMode;
  /** 'yyyy-MM-ddTHH:mm:ss'. 카드에는 날짜만 쓰지만 방이 여러 날 열려 있을 수 있다. */
  startedAt: string | null;
  completedAt: string | null;
  myCompletedMissionCount: number;
  /** 내 빙고판의 칸 수. 미션 진행률의 분모다. */
  boardCellCount: number;
  /** 대결은 승리, 그 외에는 목표 달성 여부. */
  isWin: boolean;
  participants: WalkParticipant[];
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

/** 사람마다 깬 칸 수가 다르다. */
export type WalkDetailParticipant = WalkParticipant & {
  /** 본인인지. 목록 맨 앞에 두고 빙고판에서 내 칸을 가려내는 데 쓴다. */
  isMe: boolean;
  completedMissionCount: number;
};

export type WalkBingoCell = {
  /** 판 왼쪽 위부터 0으로 시작하는 칸 번호. */
  index: number;
  missionTitle: string;
  /** 이 칸을 승인받은 사람의 memberId. 아직 아무도 못 했으면 null. */
  completedBy: number | null;
};

/**
 * 방이 열려 있던 동안의 기록. 미션·빙고·포인트 수치는 빙고판이 그대로 보여주므로
 * 따로 담지 않는다.
 */
export type WalkDetail = {
  gameId: number;
  title: string;
  mode: GameMode;
  /** 'yyyy-MM-ddTHH:mm:ss'. */
  startedAt: string | null;
  completedAt: string | null;
  /** 대결은 승리, 그 외에는 목표 달성 여부. */
  isWin: boolean;
  participants: WalkDetailParticipant[];
  /** 한 변의 칸 수. features/bingo의 BingoBoardSize와 같다. */
  bingoSize: 3 | 4 | 5;
  bingoCells: WalkBingoCell[];
};
