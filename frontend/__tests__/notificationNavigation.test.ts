/**
 * @format
 */

import {
  resolveNotificationDataDestination,
  resolveNotificationDestination,
} from '../src/features/notification/model/notificationNavigation';

test.each([
  ['FRIEND_REQUEST', null, { name: 'FriendRequests' }],
  ['FRIEND_INVITE', 12, { name: 'RoomInvites' }],
  ['WALK_START', 12, { name: 'WalkRoomDetail', params: { roomId: 12 } }],
  ['BATTLE_RESULT', 15, { name: 'WalkRoomDetail', params: { roomId: 15 } }],
  [
    'WEEKLY_BINGO_RENEWAL',
    7,
    { name: 'BingoBoard', params: { roomId: 7 } },
  ],
  ['REWARD_EARNED', 18, { name: 'WalkRoomDetail', params: { roomId: 18 } }],
] as const)(
  '%s 알림의 이동 목적지를 계산한다',
  (type, targetId, expected) => {
    expect(resolveNotificationDestination(type, targetId)).toEqual(expected);
  },
);

test('방 ID가 필요한 알림에 targetId가 없으면 알림 목록으로 이동한다', () => {
  expect(resolveNotificationDestination('WALK_START', null)).toEqual({
    name: 'Notifications',
  });
});

test('FCM 문자열 payload를 안전하게 숫자 ID로 변환한다', () => {
  expect(
    resolveNotificationDataDestination({
      type: 'WEEKLY_BINGO_RENEWAL',
      targetId: '27',
    }),
  ).toEqual({ name: 'BingoBoard', params: { roomId: 27 } });
});

test('알 수 없거나 잘못된 FCM payload는 알림 목록으로 이동한다', () => {
  expect(
    resolveNotificationDataDestination({
      type: 'SOMETHING_NEW',
      targetId: 'not-a-number',
    }),
  ).toEqual({ name: 'Notifications' });
});
