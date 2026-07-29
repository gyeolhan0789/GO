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

    await expect(refreshAccessToken()).resolves.toBe('success');
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

  test('저장된 리프레시 토큰이 없으면 요청 없이 거절로 끝낸다', async () => {
    await expect(refreshAccessToken()).resolves.toBe('rejected');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  test('refreshToken이 만료되면(401) 저장된 토큰을 모두 비운다', async () => {
    await saveRefreshToken('stale-refresh');
    setAccessToken('expired');
    fetchMock.mockResolvedValue(
      jsonResponse(401, { message: '유효하지 않은 Refresh Token입니다.' }),
    );

    await expect(refreshAccessToken()).resolves.toBe('rejected');
    expect(getAccessToken()).toBeNull();
    // Keychain에는 만료가 없어 직접 지우지 않으면 죽은 토큰이 계속 남는다.
    await expect(readRefreshToken()).resolves.toBeNull();
  });

  // 이 경로는 permitAll이라 백엔드가 403을 낼 수 없다. 왔다면 프록시가 낸 것이다.
  test('403은 백엔드 응답이 아니므로 리프레시 토큰을 남긴다', async () => {
    await saveRefreshToken('stored-refresh');
    fetchMock.mockResolvedValue(jsonResponse(403, { message: 'Forbidden' }));

    await expect(refreshAccessToken()).resolves.toBe('unavailable');
    await expect(readRefreshToken()).resolves.toBe('stored-refresh');
  });

  // 백엔드가 400을 내는 건 `@NotBlank` 위반뿐인데, 프론트는 빈 값을 보내지 않는다.
  test('400도 리프레시 토큰을 남긴다', async () => {
    await saveRefreshToken('stored-refresh');
    fetchMock.mockResolvedValue(
      jsonResponse(400, { message: '리프레시 토큰은 필수입니다.' }),
    );

    await expect(refreshAccessToken()).resolves.toBe('unavailable');
    await expect(readRefreshToken()).resolves.toBe('stored-refresh');
  });

  // 이 케이스가 원래 버그였다. 서버에 14일 남은 세션이 기기에서 영구 삭제됐다.
  test('네트워크 실패는 리프레시 토큰을 남긴다', async () => {
    await saveRefreshToken('stored-refresh');
    setAccessToken('expired');
    fetchMock.mockRejectedValue(new Error('Network request failed'));

    await expect(refreshAccessToken()).resolves.toBe('unavailable');
    expect(getAccessToken()).toBeNull();
    await expect(readRefreshToken()).resolves.toBe('stored-refresh');
  });

  test('서버 장애(500)는 리프레시 토큰을 남긴다', async () => {
    await saveRefreshToken('stored-refresh');
    fetchMock.mockResolvedValue(
      jsonResponse(500, { message: 'Internal Server Error' }),
    );

    await expect(refreshAccessToken()).resolves.toBe('unavailable');
    await expect(readRefreshToken()).resolves.toBe('stored-refresh');
  });

  test('게이트웨이 타임아웃(504)도 리프레시 토큰을 남긴다', async () => {
    await saveRefreshToken('stored-refresh');
    fetchMock.mockResolvedValue(jsonResponse(504));

    await expect(refreshAccessToken()).resolves.toBe('unavailable');
    await expect(readRefreshToken()).resolves.toBe('stored-refresh');
  });

  // 서버가 정말 회전시켰다면 다음 시도에서 401을 받고 그때 정리된다. 확실하지 않은
  // 상태에서 먼저 지울 이유가 없다.
  test('200이지만 accessToken이 없으면 토큰을 남긴 채 실패한다', async () => {
    await saveRefreshToken('stored-refresh');
    setAccessToken('expired');
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await expect(refreshAccessToken()).resolves.toBe('unavailable');
    expect(getAccessToken()).toBeNull();
    await expect(readRefreshToken()).resolves.toBe('stored-refresh');
  });

  test('200이지만 refreshToken이 없으면 토큰을 남긴 채 실패한다', async () => {
    await saveRefreshToken('stored-refresh');
    setAccessToken('expired');
    fetchMock.mockResolvedValue(jsonResponse(200, { accessToken: 'fresh' }));

    await expect(refreshAccessToken()).resolves.toBe('unavailable');
    expect(getAccessToken()).toBeNull();
    await expect(readRefreshToken()).resolves.toBe('stored-refresh');
  });

  test('회전된 토큰 저장에 실패하면 저장소를 비운다', async () => {
    await saveRefreshToken('stored-refresh');
    fetchMock.mockResolvedValue(reissued('fresh', 'rotated-refresh'));
    keychain.setGenericPassword.mockRejectedValueOnce(
      new Error('keychain unavailable'),
    );

    // 서버가 이미 회전시켜 구토큰은 죽었다. 남기면 재사용 탐지에 걸린다.
    await expect(refreshAccessToken()).resolves.toBe('rejected');
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

    await expect(Promise.all(attempts)).resolves.toEqual([
      'success',
      'success',
      'success',
    ]);
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
