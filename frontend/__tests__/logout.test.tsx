/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Alert, Pressable, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import type { KeychainMock } from '../jest/keychainMock';
import { logout } from '../src/features/auth/api/authApi';
import { useLogoutMutation } from '../src/features/auth/hooks/useLogoutMutation';
import { AuthProvider, useAuth } from '../src/features/auth/model/AuthContext';
import { HomeScreen } from '../src/screens/HomeScreen/HomeScreen';
import {
  getAccessToken,
  setAccessToken,
} from '../src/shared/api/accessTokenStore';
import {
  readRefreshToken,
  saveRefreshToken,
} from '../src/shared/api/refreshTokenStore';

jest.mock('react-native-keychain', () =>
  require('../jest/keychainMock').createKeychainMock(),
);
const keychain: KeychainMock = jest.requireMock('react-native-keychain');

// HomeScreen은 화면 이동을 useNavigation으로 받는다. 로그아웃은 이동을
// RootNavigator에 맡기므로 테스트에서는 빈 navigation으로 충분하다.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const BASE_URL = 'http://localhost:8080';
const LOGOUT_URL = `${BASE_URL}/auth/logout`;

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

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
});

function headersOf(call: [string, RequestInit?]) {
  return call[1]?.headers as Record<string, string> | undefined;
}

function bodyOf(call: [string, RequestInit?]) {
  return JSON.parse(String(call[1]?.body)) as Record<string, unknown>;
}

describe('로그아웃 요청', () => {
  test('액세스 토큰은 헤더로, 리프레시 토큰은 바디로 보낸다', async () => {
    setAccessToken('access-token');
    fetchMock.mockResolvedValue(jsonResponse(204));

    await logout({ refreshToken: 'stored-refresh' });

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe(LOGOUT_URL);
    expect(call[1]?.method).toBe('POST');
    expect(headersOf(call)?.Authorization).toBe('Bearer access-token');
    expect(bodyOf(call)).toEqual({ refreshToken: 'stored-refresh' });
  });

  test('액세스 토큰이 없으면 Authorization 헤더 없이 나가고 401을 그대로 던진다', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { message: '인증이 필요합니다.' }),
    );

    await expect(logout({ refreshToken: 'stored-refresh' })).rejects.toThrow(
      '인증이 필요합니다.',
    );
    expect(headersOf(fetchMock.mock.calls[0])?.Authorization).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('토큰 형식이 올바르지 않으면 재발급 없이 401을 던진다', async () => {
    setAccessToken('malformed');
    await saveRefreshToken('stored-refresh');
    fetchMock.mockResolvedValue(
      jsonResponse(401, { message: '유효하지 않은 토큰입니다.' }),
    );

    await expect(logout({ refreshToken: 'stored-refresh' })).rejects.toThrow(
      '유효하지 않은 토큰입니다.',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // 재발급은 리프레시 토큰을 회전시키므로, 재시도가 바디의 구토큰을 들고 나가
  // 재사용 탐지에 걸린다. 만료는 감추지 않고 호출부까지 올려보낸다.
  test('액세스 토큰이 만료돼도 재발급 재시도 없이 401을 던진다', async () => {
    setAccessToken('expired');
    await saveRefreshToken('stored-refresh');
    fetchMock.mockResolvedValue(
      jsonResponse(401, { message: '토큰이 만료되었습니다.' }),
    );

    await expect(logout({ refreshToken: 'stored-refresh' })).rejects.toThrow(
      '토큰이 만료되었습니다.',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('expired');
    await expect(readRefreshToken()).resolves.toBe('stored-refresh');
  });
});

const onError = jest.fn();

function LogoutProbe() {
  const { status } = useAuth();
  const mutation = useLogoutMutation();

  return (
    <>
      <Text>{status}</Text>
      <Pressable
        accessibilityLabel="로그아웃"
        onPress={() => mutation.mutate(undefined, { onError })}
      />
    </>
  );
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
}

async function render(children: React.ReactNode) {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <QueryClientProvider client={createQueryClient()}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>,
    );
  });

  if (!renderer) {
    throw new Error('renderer not initialized');
  }

  return renderer;
}

/** 저장된 리프레시 토큰으로 세션이 복구된 상태에서 시작한다. */
async function renderAuthenticated(children: React.ReactNode) {
  await saveRefreshToken('rotated-refresh');
  fetchMock.mockResolvedValueOnce(
    jsonResponse(200, {
      accessToken: 'access-token',
      refreshToken: 'rotated-refresh',
    }),
  );

  const tree = await render(children);
  expect(getAccessToken()).toBe('access-token');
  return tree;
}

function statusOf(tree: ReactTestRenderer.ReactTestRenderer): unknown {
  return tree.root.findAllByType(Text)[0].props.children;
}

// `deep: false`가 없으면 accessibilityLabel이 host View까지 그대로 내려가 같은
// 버튼이 여러 번 잡힌다.
function logoutButtons(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAll(
    node => node.props.accessibilityLabel === '로그아웃',
    { deep: false },
  );
}

async function pressLogout(tree: ReactTestRenderer.ReactTestRenderer) {
  const [button] = logoutButtons(tree);

  await act(async () => {
    button.props.onPress();
  });
}

describe('useLogoutMutation', () => {
  test('성공하면 액세스 토큰과 저장된 리프레시 토큰을 모두 비운다', async () => {
    const tree = await renderAuthenticated(<LogoutProbe />);
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    await pressLogout(tree);

    expect(bodyOf(fetchMock.mock.calls[1])).toEqual({
      refreshToken: 'rotated-refresh',
    });
    expect(statusOf(tree)).toBe('unauthenticated');
    expect(getAccessToken()).toBeNull();
    await expect(readRefreshToken()).resolves.toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });

  // 나열된 실패(헤더 누락, 토큰 형식 오류, 만료)는 모두 액세스 토큰이 이미 못 쓰는
  // 상태라는 뜻이다. 실패를 이유로 로그인 상태를 붙잡아 두면 사용자가 아무것도 안
  // 되는 세션에 갇힌다.
  test.each([
    ['인증이 필요합니다.'],
    ['유효하지 않은 토큰입니다.'],
    ['토큰이 만료되었습니다.'],
    ['유효하지 않은 Refresh Token입니다.'],
  ])('서버가 401 "%s"로 거절해도 세션은 정리한다', async message => {
    const tree = await renderAuthenticated(<LogoutProbe />);
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message }));

    await pressLogout(tree);

    expect(statusOf(tree)).toBe('unauthenticated');
    expect(getAccessToken()).toBeNull();
    await expect(readRefreshToken()).resolves.toBeNull();
    // 에러는 막는 데 쓰지 않고, 호출부가 알릴 수 있도록 전달만 한다.
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toHaveProperty('message', message);
  });

  test('네트워크가 끊겨도 이 기기의 세션은 정리한다', async () => {
    const tree = await renderAuthenticated(<LogoutProbe />);
    fetchMock.mockRejectedValueOnce(new Error('Network request failed'));

    await pressLogout(tree);

    expect(statusOf(tree)).toBe('unauthenticated');
    await expect(readRefreshToken()).resolves.toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  test('저장된 리프레시 토큰이 없으면 요청 없이 세션만 정리한다', async () => {
    const tree = await render(<LogoutProbe />);
    await act(async () => {
      setAccessToken('access-token');
    });
    expect(statusOf(tree)).toBe('authenticated');

    await pressLogout(tree);

    // 서버가 빈 리프레시 토큰을 400으로 거절하므로 요청을 만들지 않는다.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(statusOf(tree)).toBe('unauthenticated');
    expect(getAccessToken()).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('HomeScreen 로그아웃 버튼', () => {
  test('로그인 상태에서만 로그아웃 버튼을 띄운다', async () => {
    const tree = await render(<HomeScreen />);

    expect(logoutButtons(tree)).toHaveLength(0);

    await act(async () => {
      setAccessToken('access-token');
    });

    expect(logoutButtons(tree)).toHaveLength(1);
  });

  // 실패해도 세션이 정리되어 이 화면은 사라진다. 화면 안의 문구로는 알릴 수 없다.
  test('로그아웃이 실패하면 Alert로 알린다', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const tree = await renderAuthenticated(<HomeScreen />);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { message: '토큰이 만료되었습니다.' }),
    );

    await pressLogout(tree);

    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][1]).toContain('토큰이 만료되었습니다.');
    expect(getAccessToken()).toBeNull();
    alert.mockRestore();
  });

  test('로그아웃이 성공하면 Alert 없이 로그인 화면으로 되돌아간다', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const tree = await renderAuthenticated(<HomeScreen />);
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    await pressLogout(tree);

    expect(alert).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
    await expect(readRefreshToken()).resolves.toBeNull();
    alert.mockRestore();
  });
});
