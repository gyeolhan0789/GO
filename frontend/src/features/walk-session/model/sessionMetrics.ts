import type { SamsungHealthSummary } from '../../../shared/lib/samsungHealth';

export type WalkSessionMetrics = {
  steps: number;
  /** 소수점 한 자리. 화면 표기와 서버 저장(×1000) 양쪽에서 이 값을 쓴다. */
  distanceKm: number;
  calories: number;
};

const EMPTY_METRICS: WalkSessionMetrics = {
  steps: 0,
  distanceKm: 0,
  calories: 0,
};

/**
 * 오늘 누적치에서 세션 시작 시점 기준값을 빼서 "이 산책에서" 걷고 쓴 양만 낸다.
 *
 * 기준값을 아직 못 읽었으면(권한 문제 등) 0을 빼는 셈이라 오늘 누적치가 그대로
 * 나온다. 진행 중 화면과 워치가 같은 숫자를 보여야 해서 양쪽이 이 함수를 쓴다.
 */
export function toWalkSessionMetrics(
  today: SamsungHealthSummary | null,
  startBaseline: SamsungHealthSummary | null,
): WalkSessionMetrics {
  if (!today) {
    return EMPTY_METRICS;
  }
  return {
    steps: Math.max(0, today.steps - (startBaseline?.steps ?? 0)),
    distanceKm:
      Math.round(
        Math.max(
          0,
          today.distanceMeters - (startBaseline?.distanceMeters ?? 0),
        ) / 100,
      ) / 10,
    calories: Math.round(
      Math.max(0, today.activeCalories - (startBaseline?.activeCalories ?? 0)),
    ),
  };
}
