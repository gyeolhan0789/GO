import type { SamsungHealthDailySummary } from '../../../shared/lib/samsungHealth';
import type { SamsungHealthHourlySteps } from '../../../shared/lib/samsungHealth';
import type {
  HistoryDateResponse,
  HistoryPeriod,
  HistoryResponse,
} from '../api/historyApi';
import type { HourlyStep } from '../types';
import { eachDateInRange, resolvePeriodRange } from './period';

const HOURS_PER_DAY = 24;

/**
 * 서버(GET /histories)와 같은 형태로 만든다. SDK는 기록 없는 날의 버킷을 아예
 * 내려주지 않으므로 구간의 모든 날짜를 0으로 채우는 일을 여기서 한다.
 */
export function buildHistoryResponse(
  period: HistoryPeriod,
  date: string,
  dailySummaries: SamsungHealthDailySummary[],
): HistoryResponse {
  const range = resolvePeriodRange(period, date);
  const summaryByDate = new Map(
    dailySummaries.map(summary => [summary.date, summary]),
  );

  const histories: HistoryDateResponse[] = eachDateInRange(range).map(
    isoDate => {
      const summary = summaryByDate.get(isoDate);

      return {
        historyDate: isoDate,
        // SDK는 소수로 내려주는데 화면·서버는 정수다.
        step: Math.round(summary?.steps ?? 0),
        distance: Math.round(summary?.distanceMeters ?? 0),
        calories: Math.round(summary?.activeCalories ?? 0),
      };
    },
  );

  return {
    period,
    ...range,
    totalStep: sumBy(histories, day => day.step),
    totalDistance: sumBy(histories, day => day.distance),
    totalCalories: sumBy(histories, day => day.calories),
    histories,
  };
}

function sumBy<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}

/**
 * 0~23시를 모두 채운다. 걸음이 없는 시간대는 SDK가 버킷을 안 내려줘서
 * 그대로 쓰면 x축에 구멍이 생긴다.
 */
export function buildHourlySteps(
  hourlySteps: SamsungHealthHourlySteps[],
): HourlyStep[] {
  const stepsByHour = new Map(
    hourlySteps.map(entry => [entry.hour, entry.steps]),
  );

  return Array.from({ length: HOURS_PER_DAY }, (_, hour) => ({
    hour,
    step: Math.round(stepsByHour.get(hour) ?? 0),
  }));
}
