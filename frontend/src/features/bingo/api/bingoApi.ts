import type { MissionType } from '../model/missionType';
import { MISSION_TYPE_POINTS } from '../model/missionType';

// 백엔드 BingoCellSubmitResponse(backend/.../bingo/controller/response/BingoCellSubmitResponse.java)의
// 일부와 대응한다. 검증은 같은 HTTP 요청 안에서 동기로 끝나 폴링이 필요
// 없다 — AI 서버 호출까지 포함해 응답이 올 때까지만 기다리면 된다.
export type VerificationResult =
  | { status: 'APPROVED'; rewardCash: number }
  | { status: 'REJECTED'; rejectionReason: string };

// TODO: 사진 업로드 API가 생기면 실제 POST
// /rooms/{roomId}/bingo-boards/cells/{cellId}/submit 호출로 바꾼다. 지금은
// roomId/cellId/submitUrl이 없어 missionType만 받아 백엔드와 비슷한 체감
// (약간의 지연 후 70% 확률 승인)만 흉내낸다.
export function submitMissionPhoto(
  missionType: MissionType,
): Promise<VerificationResult> {
  return new Promise(resolve => {
    setTimeout(() => {
      // 실제 AI 승인 기준(신뢰도 0.7 이상)과 비슷한 체감이 되도록 70% 확률로 승인한다.
      const approved = Math.random() < 0.7;
      resolve(
        approved
          ? { status: 'APPROVED', rewardCash: MISSION_TYPE_POINTS[missionType] }
          : {
              status: 'REJECTED',
              rejectionReason: 'AI 검증 신뢰도가 기준(0.7)에 미달했습니다.',
            },
      );
    }, 1800);
  });
}
