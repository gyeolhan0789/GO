import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';

// 백엔드 MissionType(backend/src/main/java/com/wecandoit/mission/domain/MissionType.java)과 동일하다.
export type MissionType =
  | 'OBJECT'
  | 'ATTRIBUTE'
  | 'RELATION'
  | 'ORDINARY'
  | 'STEP_TOTAL'
  | 'STEP_CONTINUOUS'
  | 'STEP_DAILY'
  | 'WALKING_TIME_TOTAL'
  | 'WALKING_TIME_CONTINUOUS'
  | 'STEADY_PACE'
  | 'DISTANCE_TOTAL'
  | 'CALORIES_TOTAL'
  | 'AVERAGE_SPEED';

// 미션에 등록된 이미지가 없을 때 쓰는 유형별 기본 아이콘. 건강 데이터 기반 타입은
// 개별 아이콘 대신 걷기/시간/운동 세 묶음으로 묶어서 쓴다.
export const MISSION_TYPE_ICONS: Record<MissionType, IoniconsIconName> = {
  OBJECT: 'cube-outline',
  ATTRIBUTE: 'sparkles-outline',
  RELATION: 'people-outline',
  ORDINARY: 'walk-outline',
  STEP_TOTAL: 'footsteps-outline',
  STEP_CONTINUOUS: 'footsteps-outline',
  STEP_DAILY: 'footsteps-outline',
  DISTANCE_TOTAL: 'footsteps-outline',
  WALKING_TIME_TOTAL: 'time-outline',
  WALKING_TIME_CONTINUOUS: 'time-outline',
  STEADY_PACE: 'barbell-outline',
  CALORIES_TOTAL: 'barbell-outline',
  AVERAGE_SPEED: 'barbell-outline',
};

export const MISSION_TYPE_LABELS: Record<MissionType, string> = {
  OBJECT: '사물',
  ATTRIBUTE: '상태',
  RELATION: '관계',
  ORDINARY: '일상',
  STEP_TOTAL: '걷기 미션',
  STEP_CONTINUOUS: '걷기 미션',
  STEP_DAILY: '걷기 미션',
  DISTANCE_TOTAL: '걷기 미션',
  WALKING_TIME_TOTAL: '시간 미션',
  WALKING_TIME_CONTINUOUS: '시간 미션',
  STEADY_PACE: '운동 미션',
  CALORIES_TOTAL: '운동 미션',
  AVERAGE_SPEED: '운동 미션',
};
