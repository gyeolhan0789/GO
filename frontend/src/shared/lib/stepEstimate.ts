import type { Gender } from '../../features/auth/constants/genders';

/**
 * 키/몸무게 없이 걸음수만으로 거리·칼로리를 추정한다(러닝머신이 키/몸무게
 * 입력 없이도 거리·칼로리를 보여주는 것과 같은 방식). 성별별 평균 보폭/걸음당
 * 소모 칼로리를 쓴다 — 개인 실측치가 아니라 근사치다.
 */
const STRIDE_METERS_BY_GENDER: Record<Gender, number> = {
  MALE: 0.78,
  FEMALE: 0.7,
};

const CALORIES_PER_STEP_BY_GENDER: Record<Gender, number> = {
  MALE: 0.04,
  FEMALE: 0.03,
};

export function estimateDistanceMeters(steps: number, gender: Gender): number {
  return steps * STRIDE_METERS_BY_GENDER[gender];
}

export function estimateCalories(steps: number, gender: Gender): number {
  return steps * CALORIES_PER_STEP_BY_GENDER[gender];
}
