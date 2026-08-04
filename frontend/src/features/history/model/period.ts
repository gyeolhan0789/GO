import type { HistoryPeriod } from '../api/historyApi';

export type PeriodRange = {
  /** 'yyyy-MM-dd'. */
  startDate: string;
  /** 'yyyy-MM-dd'. */
  endDate: string;
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const DAYS_PER_WEEK = 7;

/** new Date(iso)는 UTC로 파싱돼 하루가 밀린다. 로컬 자정으로 만든다. */
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** toISOString은 UTC로 바꿔버려서 직접 조립한다. */
export function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

/** 백엔드 HistoryReadService와 같은 규칙. 주는 월~일, 월은 1일~말일. */
export function resolvePeriodRange(
  period: HistoryPeriod,
  isoDate: string,
): PeriodRange {
  const date = parseIsoDate(isoDate);

  if (period === 'DAY') {
    return { startDate: isoDate, endDate: isoDate };
  }

  if (period === 'WEEK') {
    // getDay()는 일요일이 0이라 월요일 기준으로 바꿔서 뺀다.
    const daysSinceMonday = (date.getDay() + 6) % DAYS_PER_WEEK;
    const monday = addDays(date, -daysSinceMonday);
    return {
      startDate: toIsoDate(monday),
      endDate: toIsoDate(addDays(monday, DAYS_PER_WEEK - 1)),
    };
  }

  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    startDate: toIsoDate(new Date(year, month, 1)),
    // 다음 달 0일 = 이번 달 말일.
    endDate: toIsoDate(new Date(year, month + 1, 0)),
  };
}

/** 구간 하나만큼 앞/뒤로 옮긴 새 기준일을 준다. */
export function shiftPeriod(
  period: HistoryPeriod,
  isoDate: string,
  step: -1 | 1,
): string {
  const date = parseIsoDate(isoDate);

  if (period === 'DAY') {
    return toIsoDate(addDays(date, step));
  }

  if (period === 'WEEK') {
    return toIsoDate(addDays(date, step * DAYS_PER_WEEK));
  }

  // 1일로 맞춘 뒤 옮긴다. 31일에서 달만 바꾸면 없는 날짜가 되어 밀린다.
  return toIsoDate(new Date(date.getFullYear(), date.getMonth() + step, 1));
}

/** 기준일이 속한 구간이 오늘까지 닿는지. */
export function isCurrentPeriod(
  period: HistoryPeriod,
  isoDate: string,
  todayIsoDate: string,
): boolean {
  // 'yyyy-MM-dd'는 자리수가 고정이라 문자열 비교로 충분하다.
  return resolvePeriodRange(period, isoDate).endDate >= todayIsoDate;
}

/** 구간에 속한 모든 날짜. 빈 날을 채우는 데 쓴다. */
export function eachDateInRange({ startDate, endDate }: PeriodRange): string[] {
  const dates: string[] = [];
  for (
    let date = parseIsoDate(startDate), iso = startDate;
    iso <= endDate;
    date = addDays(date, 1), iso = toIsoDate(date)
  ) {
    dates.push(iso);
  }
  return dates;
}

/** '월', '화' 처럼 요일 한 글자. */
export function weekdayLabel(isoDate: string): string {
  return WEEKDAY_LABELS[parseIsoDate(isoDate).getDay()];
}

/** 일: '7.28 (화)' / 주: '7.20 (월) - 7.26 (일)' / 월: '2026.07' */
export function formatPeriodLabel(
  period: HistoryPeriod,
  { startDate, endDate }: PeriodRange,
): string {
  if (period === 'DAY') {
    return formatShortDate(startDate);
  }

  if (period === 'MONTH') {
    const [year, month] = startDate.split('-');
    return `${year}.${month}`;
  }

  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
}

/** '7.20 (월)'. */
export function formatShortDate(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  return `${date.getMonth() + 1}.${date.getDate()} (${weekdayLabel(isoDate)})`;
}
