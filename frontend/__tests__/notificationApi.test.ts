/**
 * @format
 */

import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import {
  getNotifications,
  markNotificationAsRead,
  updateMyFcmToken,
} from '../src/features/notification/api/notificationApi';
import { setAccessToken } from '../src/shared/api/accessTokenStore';

const FCM_TOKEN_URL = 'http://localhost:8080/members/me/fcm-token';
const NOTIFICATIONS_URL =
  'http://localhost:8080/notifications?page=1&size=10';
const READ_NOTIFICATION_URL =
  'http://localhost:8080/notifications/17/read';

let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = installFetchMock();
  setAccessToken('access-token');
});

afterEach(() => {
  setAccessToken(null);
});

test('현재 사용자의 FCM 토큰을 인증된 PATCH 요청으로 저장한다', async () => {
  fetchMock.mockResolvedValue(jsonResponse(204));

  await expect(updateMyFcmToken('device-fcm-token')).resolves.toBeUndefined();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe(FCM_TOKEN_URL);
  expect(options?.method).toBe('PATCH');
  expect(options?.headers).toMatchObject({
    Authorization: 'Bearer access-token',
    'Content-Type': 'application/json',
  });
  expect(options?.body).toBe(
    JSON.stringify({ fcmToken: 'device-fcm-token' }),
  );
});

test('알림 목록을 페이지 조건과 함께 조회한다', async () => {
  const response = {
    content: [
      {
        id: 17,
        type: 'FRIEND_REQUEST',
        title: '친구 요청이 도착했어요',
        body: '새로운 친구 요청을 확인해 주세요.',
        targetId: 31,
        read: false,
        createdAt: '2026-08-06T14:00:00',
      },
    ],
    hasNext: false,
  };
  fetchMock.mockResolvedValue(jsonResponse(200, response));

  await expect(getNotifications({ page: 1, size: 10 })).resolves.toEqual(
    response,
  );

  expect(fetchMock).toHaveBeenCalledWith(
    NOTIFICATIONS_URL,
    expect.objectContaining({ method: 'GET' }),
  );
});

test('선택한 알림을 읽음 처리한다', async () => {
  fetchMock.mockResolvedValue(jsonResponse(204));

  await expect(markNotificationAsRead(17)).resolves.toBeUndefined();

  expect(fetchMock).toHaveBeenCalledWith(
    READ_NOTIFICATION_URL,
    expect.objectContaining({ method: 'PATCH' }),
  );
});
