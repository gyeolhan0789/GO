import { eachDateInRange, parseIsoDate, resolvePeriodRange, toIsoDate } from './period';

const DAYS_PER_WEEK = 7;

/** 그 날짜가 든 달의 1일. */
export function monthStartOf(isoDate: string): string {
  return resolvePeriodRange('MONTH', isoDate).startDate;
}

/** 일요일 시작 달력에서 1일 앞에 비는 칸 수. 1일이 수요일이면 3칸. */
export function leadingBlankCount(monthIsoDate: string): number {
  return parseIsoDate(monthStartOf(monthIsoDate)).getDay();
}

/** 그 달의 모든 날짜. */
export function eachDayInMonth(monthIsoDate: string): string[] {
  return eachDateInRange(resolvePeriodRange('MONTH', monthIsoDate));
}

/**
 * 그 달과 겹치는 모든 주의 월요일.
 * 주는 달 경계를 넘나든다(2026년 7월은 6월 29일 주부터). 1일이 든 주부터
 * 말일이 든 주까지 모아야 고를 수 있는 주가 빠지지 않는다.
 */
export function eachWeekStartInMonth(monthIsoDate: string): string[] {
  const month = resolvePeriodRange('MONTH', monthIsoDate);
  const lastMonday = resolvePeriodRange('WEEK', month.endDate).startDate;

  const starts: string[] = [];
  let monday = resolvePeriodRange('WEEK', month.startDate).startDate;

  while (monday <= lastMonday) {
    starts.push(monday);

    const next = parseIsoDate(monday);
    next.setDate(next.getDate() + DAYS_PER_WEEK);
    monday = toIsoDate(next);
  }

  return starts;
}

/** 해를 옮긴 그 해 1월 1일. */
export function shiftYear(isoDate: string, step: number): string {
  return toIsoDate(new Date(parseIsoDate(isoDate).getFullYear() + step, 0, 1));
}

/** 그 해 월 인덱스(0~11)의 1일. */
export function monthOfYear(isoDate: string, monthIndex: number): string {
  return toIsoDate(new Date(parseIsoDate(isoDate).getFullYear(), monthIndex, 1));
}
