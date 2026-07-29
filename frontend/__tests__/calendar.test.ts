/**
 * @format
 */

import {
  eachDayInMonth,
  eachWeekStartInMonth,
  leadingBlankCount,
  monthOfYear,
  monthStartOf,
  shiftYear,
} from '../src/features/history/model/calendar';

describe('monthStartOf', () => {
  test('그 달 1일로 맞춘다', () => {
    expect(monthStartOf('2026-07-23')).toBe('2026-07-01');
    expect(monthStartOf('2026-07-01')).toBe('2026-07-01');
  });
});

describe('leadingBlankCount', () => {
  test('1일이 수요일이면 앞에 3칸이 빈다', () => {
    // 2026-07-01은 수요일. 일요일 시작 달력에서 일·월·화가 빈다.
    expect(leadingBlankCount('2026-07-01')).toBe(3);
  });

  test('1일이 일요일이면 빈 칸이 없다', () => {
    // 2026-02-01은 일요일.
    expect(leadingBlankCount('2026-02-15')).toBe(0);
  });

  test('1일이 토요일이면 앞에 6칸이 빈다', () => {
    // 2026-08-01은 토요일.
    expect(leadingBlankCount('2026-08-10')).toBe(6);
  });

  test('달 중간 날짜를 줘도 1일 기준으로 센다', () => {
    expect(leadingBlankCount('2026-07-23')).toBe(
      leadingBlankCount('2026-07-01'),
    );
  });
});

describe('eachDayInMonth', () => {
  test('31일 달은 31칸이다', () => {
    const days = eachDayInMonth('2026-07-15');

    expect(days).toHaveLength(31);
    expect(days[0]).toBe('2026-07-01');
    expect(days[days.length - 1]).toBe('2026-07-31');
  });

  test('2월은 28일, 윤년은 29일이다', () => {
    expect(eachDayInMonth('2026-02-01')).toHaveLength(28);
    expect(eachDayInMonth('2024-02-01')).toHaveLength(29);
  });
});

describe('eachWeekStartInMonth', () => {
  test('달 경계를 넘는 주도 빠뜨리지 않는다', () => {
    // 2026-07-01은 수요일이라 그 주는 6월 29일(월)에 시작한다. 그 주를 빼면
    // 7월 1~5일 기록을 고를 방법이 없어진다.
    expect(eachWeekStartInMonth('2026-07-01')).toEqual([
      '2026-06-29',
      '2026-07-06',
      '2026-07-13',
      '2026-07-20',
      '2026-07-27',
    ]);
  });

  test('모든 시작일이 월요일이다', () => {
    const mondays = eachWeekStartInMonth('2026-07-01').map(start =>
      new Date(
        Number(start.slice(0, 4)),
        Number(start.slice(5, 7)) - 1,
        Number(start.slice(8, 10)),
      ).getDay(),
    );

    expect(mondays.every(day => day === 1)).toBe(true);
  });

  test('주는 7일씩 이어진다', () => {
    const starts = eachWeekStartInMonth('2026-02-01');

    starts.slice(1).forEach((start, index) => {
      const previous = new Date(starts[index]);
      const current = new Date(start);
      const days = (current.getTime() - previous.getTime()) / 86_400_000;

      expect(days).toBe(7);
    });
  });

  test('달 중간 날짜를 줘도 같은 결과다', () => {
    expect(eachWeekStartInMonth('2026-07-23')).toEqual(
      eachWeekStartInMonth('2026-07-01'),
    );
  });
});

describe('shiftYear / monthOfYear', () => {
  test('해를 옮기면 그 해 1월 1일이다', () => {
    expect(shiftYear('2026-07-23', -1)).toBe('2025-01-01');
    expect(shiftYear('2026-07-23', 1)).toBe('2027-01-01');
  });

  test('월 인덱스로 그 달 1일을 만든다', () => {
    expect(monthOfYear('2026-07-23', 0)).toBe('2026-01-01');
    expect(monthOfYear('2026-07-23', 11)).toBe('2026-12-01');
  });
});
