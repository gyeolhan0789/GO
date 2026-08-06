import type { SamsungHealthSummary } from '../../../shared/lib/samsungHealth';
import type { HistoryResponse } from '../api/historyApi';

function sumBy<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}

/**
 * 서버가 준 구간 기록의 오늘 몫을 기기에서 센 오늘 값으로 채운다.
 *
 * 일일 기록 전송은 하루가 끝난 뒤에 하므로, 서버의 오늘 행에는 산책으로 올라간 몫만
 * 있거나 아예 비어 있다. 그대로 그리면 오늘 걸은 게 그래프에 안 보인다.
 *
 * 두 값 중 큰 쪽을 쓴다 — 기기 쪽이 보통 더 크지만(산책 걸음까지 센다), 앱을 새로 깐
 * 직후처럼 원장에 아직 쌓인 게 없으면 서버 값이 더 클 수 있다.
 */
export function withTodaySummary(
  history: HistoryResponse,
  todayIsoDate: string,
  today: SamsungHealthSummary,
): HistoryResponse {
  const histories = history.histories.map(day =>
    day.historyDate === todayIsoDate
      ? {
          historyDate: day.historyDate,
          step: Math.max(day.step, Math.round(today.steps)),
          distance: Math.max(day.distance, Math.round(today.distanceMeters)),
          calories: Math.max(day.calories, Math.round(today.activeCalories)),
        }
      : day,
  );

  return {
    ...history,
    histories,
    totalStep: sumBy(histories, day => day.step),
    totalDistance: sumBy(histories, day => day.distance),
    totalCalories: sumBy(histories, day => day.calories),
  };
}
