/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import type { KeychainMock } from '../jest/keychainMock';
import { AuthProvider, useAuth } from '../src/features/auth/model/AuthContext';
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

// 재발급은 회전된 refreshToken까지 함께 내려줘야 성공으로 친다.
function reissued(accessToken: string, refreshToken: string) {
  return jsonResponse(200, { accessToken, refreshToken });
}

let fetchMock: FetchMock;
let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

beforeEach(async () => {
  fetchMock = installFetchMock();
  setAccessToken(null);
  await keychain.resetGenericPassword();
  jest.clearAllMocks();
});

afterEach(() => {
  if (renderer) {
    act(() => {
      renderer?.unmount();
    });
    renderer = null;
  }
  // 복구 재시도를 검증하는 테스트가 가짜 타이머를 켜므로 매번 되돌린다.
  jest.useRealTimers();
});

function AuthStatusProbe() {
  const { status } = useAuth();
  return <Text>{status}</Text>;
}

async function renderProvider() {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthProvider>
        <AuthStatusProbe />
      </AuthProvider>,
    );
  });

  if (!renderer) {
    throw new Error('renderer not initialized');
  }

  return renderer;
}

function statusOf(tree: ReactTestRenderer.ReactTestRenderer): unknown {
  return tree.root.findByType(Text).props.children;
}

describe('앱 시작 시 세션 복구', () => {
  test('Keychain에 refreshToken이 남아 있으면 로그인 상태로 복구된다', async () => {
    await saveRefreshToken('stored-refresh');
    fetchMock.mockResolvedValue(reissued('restored', 'rotated-refresh'));

    const tree = await renderProvider();

    expect(statusOf(tree)).toBe('authenticated');
    expect(getAccessToken()).toBe('restored');
    await expect(readRefreshToken()).resolves.toBe('rotated-refresh');
  });

  test('저장된 refreshToken이 없으면 요청 없이 미인증 상태가 된다', async () => {
    const tree = await renderProvider();

    expect(statusOf(tree)).toBe('unauthenticated');
    expect(getAccessToken()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('refreshToken이 만료됐으면 미인증 상태가 되고 저장소를 비운다', async () => {
    await saveRefreshToken('stale-refresh');
    fetchMock.mockResolvedValue(
      jsonResponse(401, { message: '유효하지 않은 Refresh Token입니다.' }),
    );

    const tree = await renderProvider();

    expect(statusOf(tree)).toBe('unauthenticated');
    expect(getAccessToken()).toBeNull();
    await expect(readRefreshToken()).resolves.toBeNull();
  });

  // 이걸 만료로 취급하면 앱을 한 번 잘못 켠 것만으로 서버에 14일 남은 세션이
  // 기기에서 영구 삭제된다.
  test('서버에 닿지 못하면 리프레시 토큰을 남긴 채 미인증이 된다', async () => {
    jest.useFakeTimers();
    await saveRefreshToken('stored-refresh');
    fetchMock.mockRejectedValue(new Error('Network request failed'));

    const tree = await renderProvider();

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(statusOf(tree)).toBe('unauthenticated');
    expect(getAccessToken()).toBeNull();
    await expect(readRefreshToken()).resolves.toBe('stored-refresh');
  });

  test('첫 시도가 네트워크 실패여도 재시도가 성공하면 복구된다', async () => {
    jest.useFakeTimers();
    await saveRefreshToken('stored-refresh');
    fetchMock
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValueOnce(reissued('restored', 'rotated-refresh'));

    const tree = await renderProvider();

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(statusOf(tree)).toBe('authenticated');
    expect(getAccessToken()).toBe('restored');
    await expect(readRefreshToken()).resolves.toBe('rotated-refresh');
  });

  // 거절은 재시도해도 결과가 같으므로 기다리게 하지 않는다.
  test('서버가 거절하면 재시도 없이 바로 미인증이 된다', async () => {
    await saveRefreshToken('stale-refresh');
    fetchMock.mockResolvedValue(
      jsonResponse(401, { message: '유효하지 않은 Refresh Token입니다.' }),
    );

    const tree = await renderProvider();

    expect(statusOf(tree)).toBe('unauthenticated');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // 이 게이트가 없으면 이미 로그인한 사용자에게 로그인 화면이 한 프레임 깜빡인다.
  test('복구가 끝나기 전에는 restoring 상태를 유지한다', async () => {
    await saveRefreshToken('stored-refresh');
    let release: (response: Response) => void = () => {};
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>(resolve => {
          release = resolve;
        }),
    );

    const tree = await renderProvider();
    expect(statusOf(tree)).toBe('restoring');

    await act(async () => {
      release(reissued('restored', 'rotated-refresh'));
    });

    expect(statusOf(tree)).toBe('authenticated');
  });

  test('세션 중 refreshToken까지 만료되면 미인증으로 전환된다', async () => {
    await saveRefreshToken('stored-refresh');
    fetchMock.mockResolvedValue(reissued('restored', 'rotated-refresh'));

    const tree = await renderProvider();
    expect(statusOf(tree)).toBe('authenticated');

    // 보호된 요청이 401 -> 재발급도 401. 이 시점에 로그인 화면으로 돌아가야 한다.
    fetchMock
      .mockReset()
      .mockResolvedValueOnce(
        jsonResponse(401, { message: '토큰이 만료되었습니다.' }),
      )
      .mockResolvedValueOnce(
        jsonResponse(401, { message: '유효하지 않은 Refresh Token입니다.' }),
      );

    await act(async () => {
      await apiClient.get('/members/me').catch(() => {});
    });

    expect(statusOf(tree)).toBe('unauthenticated');
    expect(getAccessToken()).toBeNull();
    await expect(readRefreshToken()).resolves.toBeNull();
  });
});
