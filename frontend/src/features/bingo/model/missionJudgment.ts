import type { MissionType } from './missionType';

/**
 * 활동 기반(비사진) 미션 판정에 쓰는 지표. WalkTracking 세션 스냅샷에서 얻을 수
 * 없는 "연속" 값(일시정지하면 끊기는 걸음/시간)과 "오늘 누적 걸음"은 호출부가
 * 별도로 추적해서 넘겨야 한다.
 */
export type ActivityMetrics = {
  /** 세션 시작부터 누적된 걸음 수(일시정지 구간 제외, 재개해도 이어짐). */
  totalSteps: number;
  /** 마지막으로 RUNNING 상태가 된 뒤부터 지금까지의 걸음 수. 일시정지하면 0으로 끊긴다. */
  continuousSteps: number;
  /** 세션 시작부터 누적된 활동 시간(ms, 일시정지 구간 제외). */
  activeElapsedMs: number;
  /** 마지막으로 RUNNING 상태가 된 뒤부터 지금까지의 활동 시간(ms). 일시정지하면 0으로 끊긴다. */
  continuousActiveMs: number;
  /** 세션 시작부터 누적된 이동 거리(m). */
  distanceMeters: number;
  /** 세션 시작부터 누적된 소모 칼로리(kcal). */
  calories: number;
  /** 오늘 하루 누적 걸음 수. WalkTracking 세션과 무관하게 별도로 추적된 값. */
  dailySteps: number;
};

/**
 * 아주 짧은 시간의 표본으로 평균 속도를 판정하면 GPS 튐만으로도 통과할 수 있어
 * 최소 활동 시간을 채우기 전에는 AVERAGE_SPEED를 판정하지 않는다.
 */
const MIN_AVERAGE_SPEED_SAMPLE_MS = 60_000;

/**
 * 실제 dev DB에 등록된 형식(GET /admin/missions로 확인). 예:
 * {"unit":"step","value":300,"metric":"steps","operator":">="}
 * distance는 unit이 "meter"/"kilometer"로 섞여 있어 value만으로는 부족하다.
 * STEADY_PACE(sampleIntervalSeconds/maxDeviationFromOverallAveragePercent)는
 * 이 함수가 다루지 않는다 — 항상 false로 떨어진다.
 */
type DecisionCondition = {
  metric?: string;
  unit?: string;
  value?: number;
  operator?: string;
};

function parseDecisionCondition(decisionCondition: string | null): DecisionCondition {
  if (!decisionCondition) {
    return {};
  }
  try {
    const parsed = JSON.parse(decisionCondition) as unknown;
    return parsed !== null && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function hasThreshold(value: number | undefined): value is number {
  return typeof value === 'number' && value > 0;
}

function compare(actual: number, operator: string | undefined, threshold: number): boolean {
  switch (operator) {
    case '>':
      return actual > threshold;
    case '<':
      return actual < threshold;
    case '<=':
      return actual <= threshold;
    case '==':
    case '=':
      return actual === threshold;
    default:
      return actual >= threshold;
  }
}

/** distance 조건은 unit이 "kilometer"/"meter"로 섞여 있어 m로 정규화한다. */
function toMeters(value: number, unit: string | undefined): number {
  return unit === 'kilometer' ? value * 1000 : value;
}

function computeAverageSpeedKmh(metrics: ActivityMetrics): number {
  const hours = metrics.activeElapsedMs / 3_600_000;
  return metrics.distanceMeters / 1000 / hours;
}

/**
 * 사진 인증이 아닌 활동 기반 미션(mission.type)이 metrics 기준으로 통과 조건을
 * 채웠는지 판정한다. decisionCondition은 백엔드가 검증하지 않으므로(자체 판정을
 * 신뢰) 여기서 파싱한 값이 유일한 기준이다 — 조건이 없거나 형식이 잘못됐으면
 * 항상 false를 반환한다.
 *
 * 사진 계열 타입(OBJECT/ATTRIBUTE/RELATION/ORDINARY)과 STEADY_PACE는 이 함수의
 * 대상이 아니며 항상 false를 반환한다.
 */
export function isActivityMissionComplete(
  type: MissionType,
  decisionCondition: string | null,
  metrics: ActivityMetrics,
): boolean {
  const condition = parseDecisionCondition(decisionCondition);
  if (!hasThreshold(condition.value)) {
    return false;
  }
  const { value, operator, unit } = condition;

  switch (type) {
    case 'STEP_TOTAL':
      return compare(metrics.totalSteps, operator, value);
    case 'STEP_CONTINUOUS':
      return compare(metrics.continuousSteps, operator, value);
    case 'STEP_DAILY':
      return compare(metrics.dailySteps, operator, value);
    case 'WALKING_TIME_TOTAL':
      return compare(metrics.activeElapsedMs, operator, value * 60_000);
    case 'WALKING_TIME_CONTINUOUS':
      return compare(metrics.continuousActiveMs, operator, value * 60_000);
    case 'DISTANCE_TOTAL':
      return compare(metrics.distanceMeters, operator, toMeters(value, unit));
    case 'CALORIES_TOTAL':
      return compare(metrics.calories, operator, value);
    case 'AVERAGE_SPEED':
      return (
        metrics.activeElapsedMs >= MIN_AVERAGE_SPEED_SAMPLE_MS &&
        compare(computeAverageSpeedKmh(metrics), operator, value)
      );
    default:
      return false;
  }
}
