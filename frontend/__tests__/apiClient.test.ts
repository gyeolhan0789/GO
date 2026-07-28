/**
 * @format
 */

import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import type { KeychainMock } from '../jest/keychainMock';
import { ApiError } from '../src/shared/api/ApiError';
import {
  getAccessToken,
  setAccessToken,
} from '../src/shared/api/accessTokenStore';
import { apiClient } from '../src/shared/api/client';
import {
  readRefreshToken,
  saveRefreshToken,
} from '../src/shared/api/refreshTokenStore';

jest.mock('react-native-keychain', () =>
  require('../jest/keychainMock').createKeychainMock(),
);
const keychain: KeychainMock = jest.requireMock('react-native-keychain');

const BASE_URL = 'http://localhost:8080';
const PROTECTED_URL = `${BASE_URL}/members/me`;
const REISSUE_URL = `${BASE_URL}/auth/reissue`;

let fetchMock: FetchMock;

beforeEach(async () => {
  fetchMock = installFetchMock();
  setAccessToken(null);
  await keychain.resetGenericPassword();
  jest.clearAllMocks();
});

function authorizationOf(call: [string, RequestInit?]) {
  const headers = call[1]?.headers as Record<string, string> | undefined;
  return headers?.Authorization;
}

describe('apiClient 401 재발급', () => {
  test('액세스 토큰이 만료되면 재발급하고 원래 요청을 다시 보낸다', async () => {
    setAccessToken('expired');
    await saveRefreshToken('stored-refresh');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: '토큰이 만료되었습니다.' }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          accessToken: 'fresh',
          refreshToken: 'rotated-refresh',
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { nickname: '테스터' }));

    await expect(apiClient.get('/members/me')).resolves.toEqual({
      nickname: '테스터',
    });

    const [first, second, third] = fetchMock.mock.calls;
    expect(first[0]).toBe(PROTECTED_URL);
    expect(authorizationOf(first)).toBe('Bearer expired');
    expect(second[0]).toBe(REISSUE_URL);
    // 재시도는 반드시 새 토큰으로 나가야 한다.
    expect(third[0]).toBe(PROTECTED_URL);
    expect(authorizationOf(third)).toBe('Bearer fresh');
    expect(getAccessToken()).toBe('fresh');
    await expect(readRefreshToken()).resolves.toBe('rotated-refresh');
  });

  test('재발급까지 실패하면 원래 401을 던지고 토큰을 비운다', async () => {
    setAccessToken('expired');
    await saveRefreshToken('stale-refresh');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: '토큰이 만료되었습니다.' }))
      .mockResolvedValueOnce(
        jsonResponse(401, { message: '유효하지 않은 Refresh Token입니다.' }),
      );

    await expect(apiClient.get('/members/me')).rejects.toThrow(ApiError);
    // 토큰이 비워지면 AuthProvider가 로그인 화면으로 되돌린다.
    expect(getAccessToken()).toBeNull();
    await expect(readRefreshToken()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('저장된 리프레시 토큰이 없으면 재발급 요청조차 보내지 않는다', async () => {
    setAccessToken('expired');
    fetchMock.mockResolvedValue(
      jsonResponse(401, { message: '토큰이 만료되었습니다.' }),
    );

    await expect(apiClient.get('/members/me')).rejects.toThrow(ApiError);
    // 원요청 1회뿐 — 보낼 리프레시 토큰이 없으니 재발급은 건너뛴다.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('재시도한 요청이 또 401이면 그대로 에러를 낸다', async () => {
    setAccessToken('expired');
    await saveRefreshToken('stored-refresh');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: '토큰이 만료되었습니다.' }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          accessToken: 'fresh',
          refreshToken: 'rotated-refresh',
        }),
      )
      .mockResolvedValueOnce(jsonResponse(401, { message: '유효하지 않은 토큰입니다.' }));

    await expect(apiClient.get('/members/me')).rejects.toThrow(
      '유효하지 않은 토큰입니다.',
    );
    // 재시도는 한 번뿐이라 무한 루프로 번지지 않는다.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test('토큰 없이 받은 401은 재발급을 시도하지 않는다', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, {
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      }),
    );

    await expect(
      apiClient.post('/auth/login', { email: 'a@b.com', password: 'wrong' }),
    ).rejects.toThrow('이메일 또는 비밀번호가 올바르지 않습니다.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('401이 아닌 에러는 재발급 없이 그대로 전달한다', async () => {
    setAccessToken('valid');
    fetchMock.mockResolvedValue(
      jsonResponse(409, { message: '이미 사용 중인 이메일입니다.' }),
    );

    await expect(apiClient.get('/members/me')).rejects.toThrow(
      '이미 사용 중인 이메일입니다.',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('valid');
  });
});
