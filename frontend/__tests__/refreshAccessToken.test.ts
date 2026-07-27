/**
 * @format
 */

import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import {
  getAccessToken,
  setAccessToken,
} from '../src/shared/api/accessTokenStore';
import { refreshAccessToken } from '../src/shared/api/refreshAccessToken';

const REISSUE_URL = 'http://localhost:8080/auth/reissue';

let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = installFetchMock();
  setAccessToken(null);
});

describe('refreshAccessToken', () => {
  test('재발급에 성공하면 새 액세스 토큰을 저장한다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { accessToken: 'fresh' }));

    await expect(refreshAccessToken()).resolves.toBe(true);
    expect(getAccessToken()).toBe('fresh');
  });

  test('refreshToken은 쿠키로 실려가므로 Authorization 없이 요청한다', async () => {
    setAccessToken('expired');
    fetchMock.mockResolvedValue(jsonResponse(200, { accessToken: 'fresh' }));

    await refreshAccessToken();

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(REISSUE_URL);
    expect(options?.method).toBe('POST');
    // 네이티브 쿠키 저장소가 refreshToken을 붙이도록 하는 유일한 스위치다.
    expect(options?.credentials).toBe('include');
    expect(options?.headers).toBeUndefined();
  });

  test('refreshToken이 만료되면(401) 저장된 토큰을 비운다', async () => {
    setAccessToken('expired');
    fetchMock.mockResolvedValue(
      jsonResponse(401, { message: '유효하지 않은 Refresh Token입니다.' }),
    );

    await expect(refreshAccessToken()).resolves.toBe(false);
    expect(getAccessToken()).toBeNull();
  });

  test('네트워크 실패도 재발급 실패로 처리한다', async () => {
    setAccessToken('expired');
    fetchMock.mockRejectedValue(new Error('Network request failed'));

    await expect(refreshAccessToken()).resolves.toBe(false);
    expect(getAccessToken()).toBeNull();
  });

  test('200이지만 accessToken이 없으면 실패로 본다', async () => {
    setAccessToken('expired');
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await expect(refreshAccessToken()).resolves.toBe(false);
    expect(getAccessToken()).toBeNull();
  });

  // 백엔드가 재발급마다 refreshToken을 회전시키므로, 병렬 요청은 뒤늦은 쪽이 이미
  // 폐기된 토큰을 보내 탈취로 오인받는다. 재발급은 한 번만 나가야 한다.
  test('동시에 여러 번 호출해도 재발급 요청은 한 번만 보낸다', async () => {
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

    release(jsonResponse(200, { accessToken: 'fresh' }));

    await expect(Promise.all(attempts)).resolves.toEqual([true, true, true]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('fresh');
  });

  test('앞선 재발급이 끝난 뒤에는 다시 요청을 보낸다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { accessToken: 'fresh' }));

    await refreshAccessToken();
    await refreshAccessToken();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
