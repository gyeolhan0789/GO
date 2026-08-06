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

// 백엔드 BingoBoardResponse의 일부와 대응한다(BATTLE 전용 필드인
// battleProgress는 SINGLE/COOPERATE에서 쓰지 않아 뺐다).
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

/**
 * walkSessionKey는 이 인증을 어느 산책에 귀속시킬지 정한다. 넘기지 않으면 칸은
 * 승인되지만 어떤 산책 기록에도 잡히지 않으므로, 산책 중 제출이라면 반드시
 * 실어야 한다(산책 밖에서 빙고판만 열어 제출하면 null이 맞다).
 */
export function submitBingoCellPhoto(
  roomId: number,
  cellId: number,
  photo: MissionPhoto,
  walkSessionKey: string | null,
): Promise<VerificationResult> {
  const form = new FormData();
  form.append('image', {
    uri: photo.uri,
    type: photo.type ?? 'image/jpeg',
    name: photo.fileName ?? 'mission.jpg',
  });

  // 서버가 쿼리 파라미터로 받는다(멀티파트 본문이 아니다).
  const query =
    walkSessionKey === null ? '' : `?walkSessionKey=${walkSessionKey}`;

  return apiClient
    .postForm<BingoCellSubmitResponse>(
      `/rooms/${roomId}/bingo-boards/cells/${cellId}/submit${query}`,
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
