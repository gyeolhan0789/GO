import type { HistoryDateResponse, HistoryPeriod } from '../api/historyApi';
import type { HourlyStep, RecentWalk } from '../types';
import { DAYS_PER_CHART_BUCKET, monthBucketIndex } from './histories';
import type { PeriodRange } from './period';
import { formatShortDate, resolvePeriodRange } from './period';
import { selectWalks } from './walkList';

/** 일간 차트에서 한 번에 고르는 시각 구간. endHour는 포함하지 않는다. */
export type HourRange = {
  /** 0~23. */
  startHour: number;
  /** startHour보다 크고 24까지. */
  endHour: number;
};

/**
 * 차트에서 누른 자리 하나가 가리키는 구간.
 * 주간은 하루, 월간은 7일 묶음, 일간은 시간대 블록이다.
 */
export type ChartSegment = {
  /** 차트 왼쪽부터 0. 탭 영역의 순서와 같다. */
  index: number;
  /** '7.21 (화)' / '7.1 (수) - 7.7 (화)' / '06시 - 09시'. */
  label: string;
  /** 이 구간에 속한 산책을 고르는 데 쓴다. */
  dateRange: PeriodRange;
  /** 일간에서만 채운다. 나머지는 하루 단위라 시각 제한이 없다. */
  hourRange: HourRange | null;
  step: number;
  /** 시간대별로는 걸음만 읽을 수 있어서 일간에서는 null이다. */
  distance: number | null;
  calories: number | null;
};

type DailyTotals = {
  step: number;
  distance: number;
  calories: number;
};

const EMPTY_TOTALS: DailyTotals = { step: 0, distance: 0, calories: 0 };

const HOURS_PER_DAY = 24;
/**
 * 시간마다 나누면 24칸이 되어 탭 영역이 손가락보다 좁아진다. 라벨이 3시간마다
 * 붙으므로(buildHourlyChartData) 같은 간격으로 묶어야 누른 자리와 라벨이 맞는다.
 */
const HOURS_PER_SEGMENT = 3;

// 'yyyy-MM-ddTHH:mm:ss'에서 시각만 떼어낼 자리.
const HOUR_OFFSET = 'yyyy-MM-ddT'.length;
const HOUR_LENGTH = 'HH'.length;

/**
 * 차트에 그려진 순서와 1:1로 맞물리는 구간 목록. 차트 폭을 이 배열 길이로 균등
 * 분할해 탭 영역을 얹으면 누른 자리와 구간이 맞는다.
 */
export function buildChartSegments(
  period: HistoryPeriod,
  histories: HistoryDateResponse[],
  hourlySteps: HourlyStep[],
): ChartSegment[] {
  if (period === 'DAY') {
    // 시간대 곡선이 없으면 누를 자리도 없다.
    if (histories.length === 0 || hourlySteps.length === 0) {
      return [];
    }
    return buildHourSegments(histories[0].historyDate, hourlySteps);
  }

  if (period === 'WEEK') {
    return histories.map((day, index) => ({
      index,
      label: formatShortDate(day.historyDate),
      dateRange: { startDate: day.historyDate, endDate: day.historyDate },
      hourRange: null,
      step: day.step,
      distance: day.distance,
      calories: day.calories,
    }));
  }

  return buildMonthSegments(histories);
}

/** 월간은 7일씩 묶은 막대라 구간도 같은 경계로 자른다(buildStepChartData 참고). */
function buildMonthSegments(histories: HistoryDateResponse[]): ChartSegment[] {
  if (histories.length === 0) {
    return [];
  }

  const monthEndDate = resolvePeriodRange(
    'MONTH',
    histories[0].historyDate,
  ).endDate;
  const totalsByBucket = new Map<number, DailyTotals>();
  let lastBucket = -1;

  histories.forEach(day => {
    const bucket = monthBucketIndex(day.historyDate);
    const totals = totalsByBucket.get(bucket) ?? EMPTY_TOTALS;

    totalsByBucket.set(bucket, {
      step: totals.step + day.step,
      distance: totals.distance + day.distance,
      calories: totals.calories + day.calories,
    });
    lastBucket = Math.max(lastBucket, bucket);
  });

  // 빠진 묶음도 자리를 지킨다. 차트가 그 자리에 0 막대를 세우기 때문이다.
  return Array.from({ length: lastBucket + 1 }, (_, bucket) => {
    const startDate = sameMonthDate(
      monthEndDate,
      bucket * DAYS_PER_CHART_BUCKET + 1,
    );
    const bucketEndDate = sameMonthDate(
      monthEndDate,
      (bucket + 1) * DAYS_PER_CHART_BUCKET,
    );
    // 마지막 묶음은 7일이 안 될 수 있어 말일에서 끊는다.
    const endDate = bucketEndDate > monthEndDate ? monthEndDate : bucketEndDate;

    return {
      index: bucket,
      label: `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`,
      dateRange: { startDate, endDate },
      hourRange: null,
      ...(totalsByBucket.get(bucket) ?? EMPTY_TOTALS),
    };
  });
}

/** 같은 달의 day일. ('2026-07-31', 8) -> '2026-07-08'. */
function sameMonthDate(monthIsoDate: string, day: number): string {
  const [year, month] = monthIsoDate.split('-');
  return `${year}-${month}-${`${day}`.padStart(2, '0')}`;
}

function buildHourSegments(
  isoDate: string,
  hourlySteps: HourlyStep[],
): ChartSegment[] {
  const blockCount = HOURS_PER_DAY / HOURS_PER_SEGMENT;

  return Array.from({ length: blockCount }, (_, index) => {
    const startHour = index * HOURS_PER_SEGMENT;
    const endHour = startHour + HOURS_PER_SEGMENT;

    return {
      index,
      label: `${padHour(startHour)}시 - ${padHour(endHour)}시`,
      dateRange: { startDate: isoDate, endDate: isoDate },
      hourRange: { startHour, endHour },
      step: hourlySteps
        .filter(entry => entry.hour >= startHour && entry.hour < endHour)
        .reduce((total, entry) => total + entry.step, 0),
      distance: null,
      calories: null,
    };
  });
}

function padHour(hour: number): string {
  return `${hour}`.padStart(2, '0');
}

/** 구간 안에서 시작한 산책만. 최신순으로 온다(selectWalks). */
export function selectWalksInSegment(
  walks: RecentWalk[],
  segment: ChartSegment,
): RecentWalk[] {
  const inRange = selectWalks(walks, 'all', 'latest', segment.dateRange);
  const { hourRange } = segment;

  if (hourRange === null) {
    return inRange;
  }

  return inRange.filter(walk => {
    const hour = Number(
      walk.startedAt.slice(HOUR_OFFSET, HOUR_OFFSET + HOUR_LENGTH),
    );
    return hour >= hourRange.startHour && hour < hourRange.endHour;
  });
}
