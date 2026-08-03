import { weekdayLabel } from './period';

/** 12340 -> '12,340'. Hermes의 Intl 지원 편차를 피해 직접 끊는다. */
export function formatThousands(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 값이 없어 채울 수 없는 자리. */
export const UNKNOWN_VALUE = '-';

const METERS_PER_KILOMETER = 1000;

export type Measure = {
  value: string;
  unit: string;
};

/** '840m'을 '0.8km'로 보여주면 정보가 깎여서 1km 미만은 미터로 둔다. */
export function formatDistance(meters: number): Measure {
  if (meters < METERS_PER_KILOMETER) {
    return { value: formatThousands(meters), unit: 'm' };
  }

  return {
    value: (meters / METERS_PER_KILOMETER).toFixed(1),
    unit: 'km',
  };
}

/**
 * '2026-07-20T20:00:00' -> '2026.07.20 (월) 20:00'.
 * 서버 LocalDateTime은 시간대가 없어서 Date로 파싱하지 않고 문자열을 쪼갠다.
 */
export function formatWalkDateTime(isoDateTime: string | null): string {
  if (isoDateTime === null) {
    return UNKNOWN_VALUE;
  }

  const [date, time = ''] = isoDateTime.split('T');
  const [year, month, day] = date.split('-');
  const [hour, minute] = time.split(':');
  const dayOfWeek = weekdayLabel(date);
  const clock = hour && minute ? ` ${hour}:${minute}` : '';

  return `${year}.${month}.${day} (${dayOfWeek})${clock}`;
}

/** 'yyyy-MM-ddTHH:mm:ss'에서 날짜 부분만. */
function dateOf(isoDateTime: string): string {
  const [date = ''] = isoDateTime.split('T');
  return date;
}

/**
 * 방이 열린 날부터 닫힌 날까지. 하루 안에 끝났으면 날짜 하나로 줄인다 —
 * '2026.07.26 - 2026.07.26'으로 반복할 이유가 없다.
 *
 * 시각은 어느 쪽에서도 쓰지 않는다. 방은 최대 일주일 열려 있어서 몇 시에
 * 열고 닫았는지가 기록을 읽는 데 도움이 되지 않는다.
 */
function formatDayRange(
  startedAt: string | null,
  endedAt: string | null,
  formatDay: (isoDate: string) => string,
): string {
  if (startedAt === null) {
    return endedAt === null ? UNKNOWN_VALUE : formatDay(dateOf(endedAt));
  }

  const start = formatDay(dateOf(startedAt));

  if (endedAt === null) {
    return start;
  }

  const end = formatDay(dateOf(endedAt));
  return start === end ? start : `${start} - ${end}`;
}

/** '2026.05.14 - 2026.05.21'. 목록 카드는 한 줄만 써서 요일도 뺀다. */
export function formatWalkDateRange(
  startedAt: string | null,
  endedAt: string | null,
): string {
  return formatDayRange(startedAt, endedAt, dotted);
}

/** '2026.05.14 (목) - 2026.05.21 (목)'. 상세 화면은 자리가 있어 요일까지 붙인다. */
export function formatWalkDayRange(
  startedAt: string | null,
  endedAt: string | null,
): string {
  return formatDayRange(startedAt, endedAt, formatWalkDateTime);
}

function dotted(isoDate: string): string {
  return isoDate.replace(/-/g, '.');
}
