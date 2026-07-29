import type {
  RecentWalk,
  WalkDatePreset,
  WalkDateRange,
  WalkFilter,
  WalkSort,
} from '../types';
import {
  parseIsoDate,
  resolvePeriodRange,
  shiftPeriod,
  toIsoDate,
} from './period';

const LAST_7_DAYS = 7;
const LAST_30_DAYS = 30;

/** 기간 프리셋을 실제 날짜 구간으로. '전체 기간'은 null. */
export function resolveDateRange(
  preset: WalkDatePreset,
  todayIsoDate: string,
): WalkDateRange | null {
  if (preset === 'all') {
    return null;
  }

  if (preset === 'thisMonth') {
    // 아직 안 지난 날까지 넣을 이유가 없어 오늘로 끊는다.
    return {
      startDate: resolvePeriodRange('MONTH', todayIsoDate).startDate,
      endDate: todayIsoDate,
    };
  }

  if (preset === 'lastMonth') {
    return resolvePeriodRange('MONTH', shiftPeriod('MONTH', todayIsoDate, -1));
  }

  const days = preset === 'last7' ? LAST_7_DAYS : LAST_30_DAYS;
  const start = parseIsoDate(todayIsoDate);
  // 오늘을 포함해 days일이므로 하루 덜 뺀다.
  start.setDate(start.getDate() - (days - 1));

  return { startDate: toIsoDate(start), endDate: todayIsoDate };
}

/** '2026.07.01 ~ 2026.07.26'. */
export function formatDateRangeLabel(range: WalkDateRange | null): string {
  if (range === null) {
    return '전체 기간';
  }

  return `${dotted(range.startDate)} ~ ${dotted(range.endDate)}`;
}

function dotted(isoDate: string): string {
  return isoDate.replace(/-/g, '.');
}

/** 참가자가 나 하나뿐이면 혼자. */
function isSoloWalk(walk: RecentWalk): boolean {
  return walk.participants.length <= 1;
}

function matchesFilter(walk: RecentWalk, filter: WalkFilter): boolean {
  if (filter === 'solo') {
    return isSoloWalk(walk);
  }
  if (filter === 'group') {
    return !isSoloWalk(walk);
  }
  return true;
}

function withinRange(walk: RecentWalk, range: WalkDateRange | null): boolean {
  if (range === null) {
    return true;
  }

  const date = walk.startedAt.slice(0, 'yyyy-MM-dd'.length);
  return date >= range.startDate && date <= range.endDate;
}

function compareWalks(
  left: RecentWalk,
  right: RecentWalk,
  sort: WalkSort,
): number {
  if (sort === 'oldest') {
    return left.startedAt.localeCompare(right.startedAt);
  }
  if (sort === 'mostSteps') {
    return right.step - left.step;
  }
  return right.startedAt.localeCompare(left.startedAt);
}

/**
 * 페이지를 자르기 **전에** 불러야 한다. 페이지마다 걸러내면 조건에 맞는 항목이
 * 경계에 흩어져 2페이지부터 개수와 순서가 어긋난다.
 */
export function selectWalks(
  walks: RecentWalk[],
  filter: WalkFilter,
  sort: WalkSort,
  dateRange: WalkDateRange | null,
): RecentWalk[] {
  return walks
    .filter(walk => matchesFilter(walk, filter) && withinRange(walk, dateRange))
    .sort((left, right) => compareWalks(left, right, sort));
}
