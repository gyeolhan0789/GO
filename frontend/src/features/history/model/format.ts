import { toIsoDate, weekdayLabel } from './period';

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
 * 산책 기록의 시각은 시간대가 붙은 ISO-8601(UTC)로 온다. 예전 LocalDateTime처럼
 * 문자열을 쪼개면 그대로 UTC 벽시계를 읽어 아홉 시간 어긋나므로, Date로 파싱해
 * 기기 시간대로 옮긴 뒤에 조립한다.
 */
function toLocalDate(instant: string): Date | null {
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** '2026-08-03T11:20:30Z' -> '2026.08.03'. 목록 카드는 한 줄만 써서 요일을 뺀다. */
export function formatWalkDate(instant: string): string {
  const date = toLocalDate(instant);
  return date === null ? UNKNOWN_VALUE : toIsoDate(date).replace(/-/g, '.');
}

/** '2026-08-03T11:20:30Z' -> '2026.08.03 (월) 20:20'. */
export function formatWalkDateTime(instant: string): string {
  const date = toLocalDate(instant);
  if (date === null) {
    return UNKNOWN_VALUE;
  }

  const isoDate = toIsoDate(date);
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');

  return `${isoDate.replace(/-/g, '.')} (${weekdayLabel(isoDate)}) ${hour}:${minute}`;
}

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/**
 * 1932 -> '32분', 4380 -> '1시간 13분'. 1분이 안 되는 산책을 '0분'으로 두면
 * 기록이 비어 보여서 따로 적는다.
 */
export function formatWalkDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  if (totalMinutes < 1) {
    return '1분 미만';
  }

  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;

  if (hours === 0) {
    return `${minutes}분`;
  }
  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}
