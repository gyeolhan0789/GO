/**
 * @format
 */

import { formatNotificationTime } from '../src/features/notification/model/notification';

const NOW = new Date('2026-08-06T15:00:00');

test.each([
  ['2026-08-06T14:59:30', '방금 전'],
  ['2026-08-06T14:42:00', '18분 전'],
  ['2026-08-06T12:00:00', '3시간 전'],
  ['2026-08-01T09:00:00', '8월 1일'],
  ['2025-12-31T23:00:00', '2025.12.31'],
])('%s를 %s로 표시한다', (createdAt, expected) => {
  expect(formatNotificationTime(createdAt, NOW)).toBe(expected);
});

test('잘못된 날짜 문자열은 빈 라벨로 처리한다', () => {
  expect(formatNotificationTime('invalid', NOW)).toBe('');
});
