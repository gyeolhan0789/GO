import { apiClient } from '../../../shared/api/client';
import type { Gender } from '../../auth/constants/genders';
import type { EquippedItem } from '../../member/api/memberApi';
import type { GameMode, GameRoomStatus } from '../../room/api/roomApi';

/**
 * 산책 한 건 = 방 하나에서 끝난 게임 한 판이다. 백엔드 GameResultController와
 * 대응한다. memberId는 액세스 토큰에서 꺼내므로(@LoginMemberId) 보내지 않는다 —
 * Swagger에 필수 쿼리로 보이는 건 리졸버 인자가 그대로 문서화된 탓이다.
 */

/** 백엔드 BingoCellVerificationStatus와 동일. */
export type BingoCellVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type GameResultParticipantResponse = {
  memberId: number;
  nickname: string;
  completedMissionCount: number;
  rewardPoint: number;
  /** 승패가 갈리는 대결에서만 채워진다. */
  result: boolean | null;
  /**
   * 아바타용 캐릭터 정보. 백엔드 GameResultParticipantResponse에 아직 없는
   * 필드(추가 요청 예정)라 그 전까지는 undefined고, 아바타는 기본 아이콘으로
   * 남는다. 내려오기 시작하면 랭킹처럼 채워진다.
   */
  gender?: Gender;
  defaultImageUrl?: string | null;
  equippedItems?: EquippedItem[];
};

export type GameResultResponse = {
  gameId: number;
  roomId: number;
  roomName: string;
  mode: GameMode;
  roomStatus: GameRoomStatus;
  /** 게임 전체의 성공 여부. 내 결과는 myResult가 따로 준다. */
  result: boolean;
  /** 빙고판 한 변의 칸 수. */
  boardSize: number;
  /** 목표 걸음만으로 끝나는 방에는 없다. */
  targetBingoCount: number | null;
  /** 대결은 판마다 목표가 달라 null이다. */
  targetStepCount: number | null;
  bingoCount: number;
  completedMissionCount: number;
  rewardPoint: number;
  /** 'yyyy-MM-ddTHH:mm:ss'. 서버 LocalDateTime이라 시간대가 없다. */
  startedAt: string | null;
  completedAt: string | null;
  /** 게임에 깔린 모든 빙고판의 칸 수 합계. 대결에서는 사람 수만큼 커진다. */
  totalMissionCount: number;
  myCompletedMissionCount: number;
  myRewardPoint: number;
  /** 대결에서만 채워진다. */
  myResult: boolean | null;
  participants: GameResultParticipantResponse[];
};

/** 화면이 제목만 쓰므로 미션 응답에서 필요한 것만 받는다. */
export type GameResultMissionResponse = {
  missionId: number;
  title: string;
};

export type GameResultBingoCellResponse = {
  cellId: number;
  row: number;
  col: number;
  mission: GameResultMissionResponse;
  /** 아무도 손대지 않은 칸은 상태 자체가 null로 온다. */
  verificationStatus: BingoCellVerificationStatus | null;
  /** 사진을 낸 사람. 아무도 안 냈으면 null. */
  submittedByMemberId: number | null;
};

export type GameResultBoardOwnerResponse = {
  memberId: number;
  nickname: string;
};

/** 화면이 쓰는 것만 받는다. bingoBoardId·칸 수 집계는 쓰는 데가 없어 뺐다. */
export type GameResultBingoBoardResponse = {
  /** 대결은 판 주인이 한 명, 협동·혼자는 참가자 전원이 함께 쓴다. */
  owners: GameResultBoardOwnerResponse[];
  boardSize: number;
  cells: GameResultBingoCellResponse[];
};

export type GameResultDetailResponse = GameResultResponse & {
  /** 대결이면 사람 수만큼, 그 외에는 한 판. */
  bingoBoards: GameResultBingoBoardResponse[];
};

/** 백엔드 SliceResponse. 전체 개수 없이 다음 페이지 유무만 준다. */
export type SliceResponse<T> = {
  content: T[];
  hasNext: boolean;
};

export type GetMyGameResultsParams = {
  /** 0부터. */
  page: number;
  size: number;
};

export function getMyGameResults({ page, size }: GetMyGameResultsParams) {
  return apiClient.get<SliceResponse<GameResultResponse>>(
    `/game-results?page=${page}&size=${size}`,
  );
}

/** 경로 변수는 방이 아니라 게임 식별자다(백엔드 GameResultController). */
export function getGameResult(gameId: number) {
  return apiClient.get<GameResultDetailResponse>(`/game-results/${gameId}`);
}
