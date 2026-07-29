import { weekdayLabel } from './period';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * 60;
const METERS_PER_KILOMETER = 1000;

/** 12340 -> '12,340'. Hermes의 Intl 지원 편차를 피해 직접 끊는다. */
export function formatThousands(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 751 -> '12분 31초'. 한 시간을 넘기면 초를 버린다. */
export function formatDuration(seconds: number): string {
  if (seconds >= SECONDS_PER_HOUR) {
    const hours = Math.floor(seconds / SECONDS_PER_HOUR);
    const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
  }

  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const restSeconds = seconds % SECONDS_PER_MINUTE;

  if (minutes === 0) {
    return `${restSeconds}초`;
  }

  return restSeconds === 0 ? `${minutes}분` : `${minutes}분 ${restSeconds}초`;
}

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
export function formatWalkDateTime(isoDateTime: string): string {
  const [date, time = ''] = isoDateTime.split('T');
  const [year, month, day] = date.split('-');
  const [hour, minute] = time.split(':');
  const dayOfWeek = weekdayLabel(date);
  const clock = hour && minute ? ` ${hour}:${minute}` : '';

  return `${year}.${month}.${day} (${dayOfWeek})${clock}`;
}

/** '2026.07.20 (월) 20:00 - 20:13'. 같은 날에 끝나므로 종료는 시각만. */
export function formatWalkTimeRange(
  startedAt: string,
  endedAt: string,
): string {
  const start = formatWalkDateTime(startedAt);
  const [, endTime = ''] = endedAt.split('T');
  const [hour, minute] = endTime.split(':');

  if (!hour || !minute) {
    return start;
  }

  return `${start} - ${hour}:${minute}`;
}

