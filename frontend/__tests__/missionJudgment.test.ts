/**
 * @format
 */

import {
  isActivityMissionComplete,
  type ActivityMetrics,
} from '../src/features/bingo/model/missionJudgment';

const BASE_METRICS: ActivityMetrics = {
  totalSteps: 0,
  continuousSteps: 0,
  activeElapsedMs: 0,
  continuousActiveMs: 0,
  distanceMeters: 0,
  calories: 0,
  dailySteps: 0,
};

describe('isActivityMissionComplete', () => {
  test('STEP_TOTAL: 누적 걸음이 조건 이상이면 통과', () => {
    const condition = JSON.stringify({ steps: 300 });
    expect(
      isActivityMissionComplete('STEP_TOTAL', condition, {
        ...BASE_METRICS,
        totalSteps: 300,
      }),
    ).toBe(true);
    expect(
      isActivityMissionComplete('STEP_TOTAL', condition, {
        ...BASE_METRICS,
        totalSteps: 299,
      }),
    ).toBe(false);
  });

  test('STEP_CONTINUOUS: 일시정지 후 끊긴 연속 걸음은 총 걸음과 별개로 판정', () => {
    const condition = JSON.stringify({ steps: 500 });
    expect(
      isActivityMissionComplete('STEP_CONTINUOUS', condition, {
        ...BASE_METRICS,
        totalSteps: 900,
        continuousSteps: 400,
      }),
    ).toBe(false);
    expect(
      isActivityMissionComplete('STEP_CONTINUOUS', condition, {
        ...BASE_METRICS,
        totalSteps: 900,
        continuousSteps: 500,
      }),
    ).toBe(true);
  });

  test('STEP_DAILY: WalkTracking 세션과 무관하게 오늘 누적 걸음으로 판정', () => {
    const condition = JSON.stringify({ steps: 5000 });
    expect(
      isActivityMissionComplete('STEP_DAILY', condition, {
        ...BASE_METRICS,
        totalSteps: 100,
        dailySteps: 5000,
      }),
    ).toBe(true);
  });

  test('WALKING_TIME_TOTAL: 분 단위 조건을 ms 누적 활동 시간과 비교', () => {
    const condition = JSON.stringify({ minutes: 10 });
    expect(
      isActivityMissionComplete('WALKING_TIME_TOTAL', condition, {
        ...BASE_METRICS,
        activeElapsedMs: 10 * 60_000,
      }),
    ).toBe(true);
    expect(
      isActivityMissionComplete('WALKING_TIME_TOTAL', condition, {
        ...BASE_METRICS,
        activeElapsedMs: 10 * 60_000 - 1,
      }),
    ).toBe(false);
  });

  test('WALKING_TIME_CONTINUOUS: 연속 활동 시간만 본다', () => {
    const condition = JSON.stringify({ minutes: 10 });
    expect(
      isActivityMissionComplete('WALKING_TIME_CONTINUOUS', condition, {
        ...BASE_METRICS,
        activeElapsedMs: 30 * 60_000,
        continuousActiveMs: 9 * 60_000,
      }),
    ).toBe(false);
  });

  test('DISTANCE_TOTAL: 누적 이동 거리(m)로 판정', () => {
    const condition = JSON.stringify({ meters: 1000 });
    expect(
      isActivityMissionComplete('DISTANCE_TOTAL', condition, {
        ...BASE_METRICS,
        distanceMeters: 1000,
      }),
    ).toBe(true);
  });

  test('CALORIES_TOTAL: 누적 소모 칼로리로 판정', () => {
    const condition = JSON.stringify({ kcal: 50 });
    expect(
      isActivityMissionComplete('CALORIES_TOTAL', condition, {
        ...BASE_METRICS,
        calories: 49,
      }),
    ).toBe(false);
  });

  test('AVERAGE_SPEED: 거리/시간으로 평균 속도(km/h)를 계산해 비교', () => {
    const condition = JSON.stringify({ kmh: 4 });
    // 4km/h로 10분 걸으면 약 666.7m.
    expect(
      isActivityMissionComplete('AVERAGE_SPEED', condition, {
        ...BASE_METRICS,
        activeElapsedMs: 10 * 60_000,
        distanceMeters: 667,
      }),
    ).toBe(true);
  });

  test('AVERAGE_SPEED: 최소 활동 시간을 채우기 전엔 GPS 튐으로 통과하지 않는다', () => {
    const condition = JSON.stringify({ kmh: 4 });
    expect(
      isActivityMissionComplete('AVERAGE_SPEED', condition, {
        ...BASE_METRICS,
        activeElapsedMs: 5_000,
        distanceMeters: 50, // 순간 속도로는 36km/h.
      }),
    ).toBe(false);
  });

  test('decisionCondition이 없거나 형식이 잘못되면 통과시키지 않는다', () => {
    expect(
      isActivityMissionComplete('STEP_TOTAL', null, {
        ...BASE_METRICS,
        totalSteps: 999_999,
      }),
    ).toBe(false);
    expect(
      isActivityMissionComplete('STEP_TOTAL', 'not-json', {
        ...BASE_METRICS,
        totalSteps: 999_999,
      }),
    ).toBe(false);
    expect(
      isActivityMissionComplete('STEP_TOTAL', JSON.stringify({ steps: 0 }), {
        ...BASE_METRICS,
        totalSteps: 999_999,
      }),
    ).toBe(false);
  });

  test('사진 계열 타입은 이 함수의 대상이 아니라 항상 false', () => {
    expect(
      isActivityMissionComplete('OBJECT', JSON.stringify({ steps: 1 }), {
        ...BASE_METRICS,
        totalSteps: 999_999,
      }),
    ).toBe(false);
  });
});
