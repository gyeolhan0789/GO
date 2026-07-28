/**
 * @format
 */

import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import type { KeychainMock } from '../jest/keychainMock';
import {
  getAccessToken,
  setAccessToken,
} from '../src/shared/api/accessTokenStore';
import { refreshAccessToken } from '../src/shared/api/refreshAccessToken';
import {
  readRefreshToken,
  saveRefreshToken,
} from '../src/shared/api/refreshTokenStore';

jest.mock('react-native-keychain', () =>
  require('../jest/keychainMock').createKeychainMock(),
);
const keychain: KeychainMock = jest.requireMock('react-native-keychain');

const REISSUE_URL = 'http://localhost:8080/auth/reissue';

// 재발급은 회전된 refreshToken까지 함께 내려줘야 성공으로 친다.
function reissued(accessToken: string, refreshToken: string) {
  return jsonResponse(200, { accessToken, refreshToken });
}

// Keychain 읽기가 비동기라 fetch는 다음 마이크로태스크에서야 호출된다. 대기 중인
// 프라미스를 모두 흘려보내 fetch가 실제로 나가게 한다.
function flushPending() {
  return new Promise<void>(resolve => setImmediate(() => resolve()));
}

let fetchMock: FetchMock;

beforeEach(async () => {
  fetchMock = installFetchMock();
  setAccessToken(null);
  await keychain.resetGenericPassword();
  jest.clearAllMocks();
});

describe('refreshAccessToken', () => {
  test('재발급에 성공하면 액세스 토큰과 회전된 리프레시 토큰을 저장한다', async () => {
    await saveRefreshToken('stored-refresh');
    fetchMock.mockResolvedValue(reissued('fresh', 'rotated-refresh'));

    await expect(refreshAccessToken()).resolves.toBe(true);
    expect(getAccessToken()).toBe('fresh');
    // 회전된 토큰을 덮어쓰지 않으면 다음 실행에서 재사용 탐지에 걸린다.
    await expect(readRefreshToken()).resolves.toBe('rotated-refresh');
  });

  test('저장된 리프레시 토큰을 바디에 담아 보낸다', async () => {
    await saveRefreshToken('stored-refresh');
    setAccessToken('expired');
    fetchMock.mockResolvedValue(reissued('fresh', 'rotated-refresh'));

    await refreshAccessToken();

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(REISSUE_URL);
    expect(options?.method).toBe('POST');
    expect(JSON.parse(String(options?.body))).toEqual({
      refreshToken: 'stored-refresh',
    });
    // 만료된 액세스 토큰은 재발급에 필요 없다.
    expect(options?.headers).not.toHaveProperty('Authorization');
  });

  test('저장된 리프레시 토큰이 없으면 요청 없이 실패한다', async () => {
    await expect(refreshAccessToken()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  test('refreshToken이 만료되면(401) 저장된 토큰을 모두 비운다', async () => {
    await saveRefreshToken('stale-refresh');
    setAccessToken('expired');
    fetchMock.mockResolvedValue(
      jsonResponse(401, { message: '유효하지 않은 Refresh Token입니다.' }),
    );

    await expect(refreshAccessToken()).resolves.toBe(false);
    expect(getAccessToken()).toBeNull();
    // Keychain에는 만료가 없어 직접 지우지 않으면 죽은 토큰이 계속 남는다.
    await expect(readRefreshToken()).resolves.toBeNull();
  });

  test('네트워크 실패도 재발급 실패로 처리한다', async () => {
    await saveRefreshToken('stored-refresh');
    setAccessToken('expired');
    fetchMock.mockRejectedValue(new Error('Network request failed'));

    await expect(refreshAccessToken()).resolves.toBe(false);
    expect(getAccessToken()).toBeNull();
    await expect(readRefreshToken()).resolves.toBeNull();
  });

  test('200이지만 accessToken이 없으면 실패로 본다', async () => {
    await saveRefreshToken('stored-refresh');
    setAccessToken('expired');
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await expect(refreshAccessToken()).resolves.toBe(false);
    expect(getAccessToken()).toBeNull();
  });

  test('200이지만 refreshToken이 없으면 실패로 본다', async () => {
    await saveRefreshToken('stored-refresh');
    setAccessToken('expired');
    fetchMock.mockResolvedValue(jsonResponse(200, { accessToken: 'fresh' }));

    // 회전된 토큰을 못 받으면 다음 재발급이 반드시 실패하므로, 지금 끊는 편이 낫다.
    await expect(refreshAccessToken()).resolves.toBe(false);
    expect(getAccessToken()).toBeNull();
  });

  test('회전된 토큰 저장에 실패하면 재발급도 실패로 처리한다', async () => {
    await saveRefreshToken('stored-refresh');
    fetchMock.mockResolvedValue(reissued('fresh', 'rotated-refresh'));
    keychain.setGenericPassword.mockRejectedValueOnce(
      new Error('keychain unavailable'),
    );

    // 구토큰이 남은 채 로그인 상태가 되면 다음 실행에서 세션이 통째로 날아간다.
    await expect(refreshAccessToken()).resolves.toBe(false);
    expect(getAccessToken()).toBeNull();
    await expect(readRefreshToken()).resolves.toBeNull();
  });

  // 백엔드가 재발급마다 refreshToken을 회전시키므로, 병렬 요청은 뒤늦은 쪽이 이미
  // 폐기된 토큰을 보내 탈취로 오인받는다. 재발급은 한 번만 나가야 한다.
  test('동시에 여러 번 호출해도 재발급 요청은 한 번만 보낸다', async () => {
    await saveRefreshToken('stored-refresh');
    let release: (response: Response) => void = () => {};
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>(resolve => {
          release = resolve;
        }),
    );

    const attempts = [
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ];

    await flushPending();
    release(reissued('fresh', 'rotated-refresh'));

    await expect(Promise.all(attempts)).resolves.toEqual([true, true, true]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('fresh');
  });

  test('앞선 재발급이 끝난 뒤에는 다시 요청을 보낸다', async () => {
    await saveRefreshToken('stored-refresh');
    fetchMock.mockResolvedValue(reissued('fresh', 'rotated-refresh'));

    await refreshAccessToken();
    await refreshAccessToken();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
