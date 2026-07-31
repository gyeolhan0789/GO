// 백엔드 MissionType(backend/src/main/java/com/wecandoit/mission/domain/MissionType.java)과 동일하다.
export type MissionType = 'OBJECT' | 'ATTRIBUTE' | 'RELATION' | 'ORDINARY';

// 백엔드 CashRewardPolicy의 BINGO_CELL_* 보상 포인트와 맞춘 값. 실제 포인트는
// 인증 제출 응답에서만 내려오므로, 목록에서 미리 보여주는 용도로만 쓴다.
export const MISSION_TYPE_POINTS: Record<MissionType, number> = {
  OBJECT: 30,
  ATTRIBUTE: 50,
  RELATION: 70,
  ORDINARY: 30,
};

export const MISSION_TYPE_LABELS: Record<MissionType, string> = {
  OBJECT: '사물',
  ATTRIBUTE: '상태',
  RELATION: '관계',
  ORDINARY: '일상',
};
