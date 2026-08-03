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
