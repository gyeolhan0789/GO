/**
 * @format
 */

import type { SamsungHealthSummary } from '../src/shared/lib/samsungHealth';
import { toWalkSessionMetrics } from '../src/features/walk-session/model/sessionMetrics';

function summary(
  steps: number,
  distanceMeters: number,
  activeCalories: number,
): SamsungHealthSummary {
  return { steps, distanceMeters, activeCalories };
}

describe('산책 세션 수치', () => {
  test('오늘 누적치에서 시작 기준값을 뺀 만큼만 센다', () => {
    const metrics = toWalkSessionMetrics(
      summary(5200, 3840, 190),
      summary(4000, 3000, 150),
    );

    expect(metrics).toEqual({ steps: 1200, distanceKm: 0.8, calories: 40 });
  });

  test('기준값을 아직 못 읽었으면 오늘 누적치를 그대로 쓴다', () => {
    const metrics = toWalkSessionMetrics(summary(1500, 1200, 60), null);

    expect(metrics).toEqual({ steps: 1500, distanceKm: 1.2, calories: 60 });
  });

  test('오늘 누적치를 못 읽었으면 0으로 둔다', () => {
    expect(toWalkSessionMetrics(null, summary(4000, 3000, 150))).toEqual({
      steps: 0,
      distanceKm: 0,
      calories: 0,
    });
  });

  test('자정을 넘겨 누적치가 기준값보다 작아져도 음수가 되지 않는다', () => {
    const metrics = toWalkSessionMetrics(
      summary(120, 90, 5),
      summary(9000, 7000, 350),
    );

    expect(metrics).toEqual({ steps: 0, distanceKm: 0, calories: 0 });
  });
});
