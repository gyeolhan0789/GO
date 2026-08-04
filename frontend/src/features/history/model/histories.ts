import type { HistoryDateResponse, HistoryPeriod } from '../api/historyApi';
import type { HourlyStep } from '../types';
import { parseIsoDate, weekdayLabel } from './period';

export type StepChartDatum = {
  label: string;
  value: number;
  highlighted?: boolean;
};

export const DAYS_PER_CHART_BUCKET = 7;

/** 월간 차트에서 이 날짜가 들어가는 막대 번호. 1~7일이 0. */
export function monthBucketIndex(historyDate: string): number {
  return Math.floor(
    (parseIsoDate(historyDate).getDate() - 1) / DAYS_PER_CHART_BUCKET,
  );
}

/**
 * 주는 하루에 막대 하나(월~일), 월은 7일씩 묶어 '1주'~'5주'로 줄인다.
 * 한 달을 31개 막대로 그리면 라벨이 겹쳐 읽을 수 없다.
 */
export function buildStepChartData(
  period: HistoryPeriod,
  histories: HistoryDateResponse[],
  todayIsoDate: string,
): StepChartDatum[] {
  if (period === 'WEEK') {
    return histories.map(day => ({
      label: weekdayLabel(day.historyDate),
      value: day.step,
      highlighted: day.historyDate === todayIsoDate,
    }));
  }

  if (period === 'MONTH') {
    const stepByBucket = new Map<number, number>();
    let highlightedBucket = -1;
    let lastBucket = -1;

    histories.forEach(day => {
      const bucket = monthBucketIndex(day.historyDate);

      stepByBucket.set(bucket, (stepByBucket.get(bucket) ?? 0) + day.step);
      lastBucket = Math.max(lastBucket, bucket);
      if (day.historyDate === todayIsoDate) {
        highlightedBucket = bucket;
      }
    });

    // 빠진 주를 0으로 채운다. 배열에 구멍이 남으면 BarChart가 터진다.
    return Array.from({ length: lastBucket + 1 }, (_, bucket) => ({
      label: `${bucket + 1}주`,
      value: stepByBucket.get(bucket) ?? 0,
      highlighted: bucket === highlightedBucket,
    }));
  }

  // 일간은 buildHourlyChartData가 시간대별로 따로 그린다.
  return [];
}

// 24개 점에 라벨을 다 달면 겹친다.
const HOUR_LABEL_INTERVAL = 3;
const HOUR_PAD_LENGTH = 2;

/**
 * 00~23시를 다 그린다. 새벽을 잘라내면 하루 합계(자정부터)와 곡선의 합이 어긋난다.
 * 라벨은 3시간마다만 채우고 나머지는 빈 문자열로 둔다.
 */
export function buildHourlyChartData(
  hourlySteps: HourlyStep[],
): StepChartDatum[] {
  return hourlySteps.map(entry => ({
    label:
      entry.hour % HOUR_LABEL_INTERVAL === 0
        ? `${entry.hour}`.padStart(HOUR_PAD_LENGTH, '0')
        : '',
    value: entry.step,
  }));
}

/** 요약 카드 제목. */
export function stepSummaryTitle(
  period: HistoryPeriod,
  isCurrent: boolean,
): string {
  if (period === 'DAY') {
    return isCurrent ? '오늘 걸음' : '하루 걸음';
  }
  if (period === 'WEEK') {
    return isCurrent ? '이번 주 걸음' : '한 주 걸음';
  }
  return isCurrent ? '이번 달 걸음' : '한 달 걸음';
}
