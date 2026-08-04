import { apiClient } from '../../../shared/api/client';
import type { MissionType } from '../model/missionType';

export type BingoCellVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type BingoMissionResponse = {
  missionId: number;
  missionImageUrl: string | null;
  type: MissionType;
  title: string;
  detail: string;
  decisionCondition: string;
  point: number;
};

export type BingoCellResponse = {
  cellId: number;
  row: number;
  col: number;
  mission: BingoMissionResponse;
  verificationStatus: BingoCellVerificationStatus;
  submittedByMemberId: number | null;
  rejectionReason: string | null;
};

export type BattleParticipantProgress = {
  memberId: number;
  bingoBoardId: number;
  totalCellCount: number;
  approvedCellCount: number;
  /** 완성한 빙고 줄 수. 목표에 닿으면 이긴다. */
  completedBingoCount: number;
  targetReached: boolean;
};

/**
 * 대결방에서만 내려온다. 대결은 판을 사람마다 따로 받아서, 내 판만 봐서는
 * 이기고 있는지 알 수 없다.
 */
export type BattleProgress = {
  roomStatus: 'ACTIVE' | 'CLOSED';
  gameStatus: 'ACTIVE' | 'ENDED';
  me: BattleParticipantProgress;
  opponent: BattleParticipantProgress;
  /**
   * 서버가 아직 항상 null로 준다(BingoReadService에서 하드코딩). 승패는
   * targetReached로 유추하거나 기록 조회로 따로 확인해야 한다.
   */
  result: boolean | null;
};

// 백엔드 BingoBoardResponse와 대응한다.
export type BingoBoardResponse = {
  bingoBoardId: number;
  roomId: number;
  boardSize: number;
  targetStepCount: number | null;
  completedBingoCount: number;
  totalCellCount: number;
  approvedCellCount: number;
  cells: BingoCellResponse[];
  completed: boolean;
  canRenew: boolean;
  renewalRequired: boolean;
  renewalMessage: string | null;
  /** BATTLE에서만 채워진다. 다른 모드에서는 없다. */
  battleProgress?: BattleProgress | null;
};

export function getActiveBingoBoard(roomId: number) {
  return apiClient.get<BingoBoardResponse>(`/rooms/${roomId}/bingo-boards/active`);
}

export type RenewBingoBoardRequest = {
  boardSize: number;
  targetStepCount: number;
};

export function renewBingoBoard(roomId: number, body: RenewBingoBoardRequest) {
  return apiClient.post<BingoBoardResponse>(
    `/rooms/${roomId}/bingo-boards/renewal`,
    body,
  );
}

export type VerificationResult =
  | { status: 'APPROVED'; rewardPoint: number }
  | { status: 'REJECTED'; rejectionReason: string };

// 백엔드 BingoCellSubmitResponse(backend/.../bingo/controller/response/BingoCellSubmitResponse.java)와
// 대응한다. 검증은 같은 HTTP 요청 안에서 동기로 끝나 폴링이 필요 없다 —
// AI 서버 호출까지 포함해 응답이 올 때까지만 기다리면 된다.
type BingoCellSubmitResponse = {
  cellId: number;
  row: number;
  col: number;
  mission: BingoMissionResponse;
  verificationStatus: BingoCellVerificationStatus;
  submittedByMemberId: number | null;
  rejectionReason: string | null;
  rewardPoint: number;
};

export type MissionPhoto = {
  uri: string;
  type?: string;
  fileName?: string;
};

export function submitBingoCellPhoto(
  roomId: number,
  cellId: number,
  photo: MissionPhoto,
): Promise<VerificationResult> {
  const form = new FormData();
  form.append('image', {
    uri: photo.uri,
    type: photo.type ?? 'image/jpeg',
    name: photo.fileName ?? 'mission.jpg',
  });

  return apiClient
    .postForm<BingoCellSubmitResponse>(
      `/rooms/${roomId}/bingo-boards/cells/${cellId}/submit`,
      form,
    )
    .then(response =>
      response.verificationStatus === 'APPROVED'
        ? { status: 'APPROVED', rewardPoint: response.rewardPoint }
        : {
            status: 'REJECTED',
            rejectionReason: response.rejectionReason ?? '인증에 실패했습니다.',
          },
    );
}

// 사진이 아닌 활동 기반 미션(걸음 수 등) 칸을 완료 처리한다. 요청 body 없이
// 호출 자체가 통과를 의미하며, 백엔드는 활동 데이터를 재검증하지 않고 프론트의
// 판정을 신뢰한다 — 성공 응답은 항상 APPROVED라 REJECTED 분기가 없다.
export function completeBingoCell(
  roomId: number,
  cellId: number,
): Promise<{ rewardPoint: number }> {
  return apiClient
    .post<BingoCellSubmitResponse>(
      `/rooms/${roomId}/bingo-boards/cells/${cellId}/complete`,
    )
    .then(response => ({ rewardPoint: response.rewardPoint }));
}
