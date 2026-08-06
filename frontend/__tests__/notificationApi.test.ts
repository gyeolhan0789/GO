/**
 * @format
 */

import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import { updateMyFcmToken } from '../src/features/notification/api/notificationApi';
import { setAccessToken } from '../src/shared/api/accessTokenStore';

const FCM_TOKEN_URL = 'http://localhost:8080/members/me/fcm-token';

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
