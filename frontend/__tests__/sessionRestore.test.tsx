/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import { AuthProvider, useAuth } from '../src/features/auth/model/AuthContext';
import {
  getAccessToken,
  setAccessToken,
} from '../src/shared/api/accessTokenStore';
import { apiClient } from '../src/shared/api/client';

let fetchMock: FetchMock;
let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

beforeEach(() => {
  fetchMock = installFetchMock();
  setAccessToken(null);
});

afterEach(() => {
  if (renderer) {
    act(() => {
      renderer?.unmount();
    });
    renderer = null;
  }
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
  test('쿠키에 refreshToken이 남아 있으면 로그인 상태로 복구된다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { accessToken: 'restored' }));

    const tree = await renderProvider();

    expect(statusOf(tree)).toBe('authenticated');
    expect(getAccessToken()).toBe('restored');
  });

  test('refreshToken이 없거나 만료됐으면 미인증 상태가 된다', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { message: '유효하지 않은 Refresh Token입니다.' }),
    );

    const tree = await renderProvider();

    expect(statusOf(tree)).toBe('unauthenticated');
    expect(getAccessToken()).toBeNull();
  });

  // 이 게이트가 없으면 이미 로그인한 사용자에게 로그인 화면이 한 프레임 깜빡인다.
  test('복구가 끝나기 전에는 restoring 상태를 유지한다', async () => {
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
      release(jsonResponse(200, { accessToken: 'restored' }));
    });

    expect(statusOf(tree)).toBe('authenticated');
  });

  test('세션 중 refreshToken까지 만료되면 미인증으로 전환된다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { accessToken: 'restored' }));

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
  });
});
