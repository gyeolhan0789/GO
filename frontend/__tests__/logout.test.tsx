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
import { MyPageScreen } from '../src/screens/MyPageScreen/MyPageScreen';
import {
  getAccessToken,
  setAccessToken,
} from '../src/shared/api/accessTokenStore';
import {
  LOGIN_HISTORY_QUERY_KEY,
  ONBOARDING_QUERY_KEY,
  PERMISSIONS_GRANTED_QUERY_KEY,
  PERMISSIONS_QUERY_KEY,
} from '../src/shared/api/deviceQueries';
import {
  readRefreshToken,
  saveRefreshToken,
} from '../src/shared/api/refreshTokenStore';

jest.mock('react-native-keychain', () =>
  require('../jest/keychainMock').createKeychainMock(),
);
const keychain: KeychainMock = jest.requireMock('react-native-keychain');

// 로그아웃은 화면 이동을 RootNavigator에 맡기므로 빈 navigation으로 충분하다.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// 마이페이지가 띄우는 캐릭터 조회까지 네트워크를 타면 로그아웃 요청 기록에 섞인다.
jest.mock('../src/features/member/api/memberApi', () => ({
  getMyCharacter: jest.fn(() =>
    Promise.resolve({
      memberId: 1,
      nickname: '멍멍이',
      defaultImageUrl: null,
      equippedItems: [],
    }),
  ),
  updateMyProfile: jest.fn(() => Promise.resolve()),
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

async function render(
  children: React.ReactNode,
  client: QueryClient = createQueryClient(),
) {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <QueryClientProvider client={client}>
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
async function renderAuthenticated(
  children: React.ReactNode,
  client?: QueryClient,
) {
  await saveRefreshToken('rotated-refresh');
  fetchMock.mockResolvedValueOnce(
    jsonResponse(200, {
      accessToken: 'access-token',
      refreshToken: 'rotated-refresh',
    }),
  );

  const tree = await render(children, client);
  expect(getAccessToken()).toBe('access-token');
  return tree;
}

function statusOf(tree: ReactTestRenderer.ReactTestRenderer): unknown {
  return tree.root.findAllByType(Text)[0].props.children;
}

// deep: false가 없으면 accessibilityLabel이 host View까지 내려가 중복으로 잡힌다.
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

    expect(fetchMock).not.toHaveBeenCalled();
    expect(statusOf(tree)).toBe('unauthenticated');
    expect(getAccessToken()).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('액세스 토큰 만료 시 재발급 후 재시도', () => {
  test('회전된 새 리프레시 토큰으로 다시 보내 서버 정리까지 마친다', async () => {
    const tree = await renderAuthenticated(<LogoutProbe />);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(401, { message: '토큰이 만료되었습니다.' }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          accessToken: 'fresh-access',
          refreshToken: 'rotated-twice',
        }),
      )
      .mockResolvedValueOnce(jsonResponse(204));

    await pressLogout(tree);

    const [, first, reissue, retry] = fetchMock.mock.calls;
    expect(first[0]).toBe(LOGOUT_URL);
    expect(bodyOf(first)).toEqual({ refreshToken: 'rotated-refresh' });
    expect(reissue[0]).toBe(`${BASE_URL}/auth/reissue`);
    // 구토큰을 보내면 서버가 저장값과 비교해 탈취로 판단한다.
    expect(retry[0]).toBe(LOGOUT_URL);
    expect(headersOf(retry)?.Authorization).toBe('Bearer fresh-access');
    expect(bodyOf(retry)).toEqual({ refreshToken: 'rotated-twice' });

    expect(onError).not.toHaveBeenCalled();
    expect(statusOf(tree)).toBe('unauthenticated');
    await expect(readRefreshToken()).resolves.toBeNull();
  });

  test('재발급까지 실패하면 원래 401을 그대로 전달한다', async () => {
    const tree = await renderAuthenticated(<LogoutProbe />);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(401, { message: '토큰이 만료되었습니다.' }),
      )
      .mockResolvedValueOnce(
        jsonResponse(401, { message: '유효하지 않은 Refresh Token입니다.' }),
      );

    await pressLogout(tree);

    // 마운트 1 + 로그아웃 1 + 재발급 1.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toHaveProperty(
      'message',
      '토큰이 만료되었습니다.',
    );
    expect(statusOf(tree)).toBe('unauthenticated');
  });

  test('만료가 아닌 실패는 재발급을 시도하지 않는다', async () => {
    const tree = await renderAuthenticated(<LogoutProbe />);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { message: '리프레시 토큰은 필수입니다.' }),
    );

    await pressLogout(tree);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe('로그아웃 시 쿼리 캐시', () => {
  test('계정 데이터는 비우고 기기 단위 값은 남긴다', async () => {
    const client = createQueryClient();
    client.setQueryData(['friends'], [{ id: 1 }]);
    client.setQueryData(ONBOARDING_QUERY_KEY, true);
    client.setQueryData(PERMISSIONS_QUERY_KEY, true);
    client.setQueryData(PERMISSIONS_GRANTED_QUERY_KEY, true);
    client.setQueryData(LOGIN_HISTORY_QUERY_KEY, true);

    const tree = await renderAuthenticated(<LogoutProbe />, client);
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    await pressLogout(tree);

    expect(client.getQueryData(['friends'])).toBeUndefined();
    expect(client.getQueryData(ONBOARDING_QUERY_KEY)).toBe(true);
    expect(client.getQueryData(PERMISSIONS_QUERY_KEY)).toBe(true);
    expect(client.getQueryData(PERMISSIONS_GRANTED_QUERY_KEY)).toBe(true);
    expect(client.getQueryData(LOGIN_HISTORY_QUERY_KEY)).toBe(true);
  });
});

// 마이페이지는 로그인 뒤에만 닿는 화면이라(RootNavigator가 게이트) 화면 자체는
// 인증 여부를 다시 따지지 않는다. navigation은 캐릭터 변경 이동에만 쓰인다.
const NAVIGATION_STUB = {
  navigate: jest.fn(),
} as unknown as React.ComponentProps<typeof MyPageScreen>['navigation'];

function myPage() {
  return (
    <MyPageScreen
      navigation={NAVIGATION_STUB}
      route={
        { key: 'MyPage', name: 'MyPage' } as React.ComponentProps<
          typeof MyPageScreen
        >['route']
      }
    />
  );
}

describe('마이페이지 로그아웃 버튼', () => {
  test('로그아웃 버튼을 띄운다', async () => {
    const tree = await renderAuthenticated(myPage());

    expect(logoutButtons(tree)).toHaveLength(1);
  });

  test('서버가 거절하면 세션이 만료됐다고 알린다', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const tree = await renderAuthenticated(myPage());
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { message: '유효하지 않은 Refresh Token입니다.' }),
    );

    await pressLogout(tree);

    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][0]).toBe('로그아웃했어요');
    // 서버 원문을 그대로 노출하지 않는다.
    expect(alert.mock.calls[0][1]).toBe('세션이 이미 만료되어 있었어요.');
    expect(getAccessToken()).toBeNull();
    alert.mockRestore();
  });

  test('네트워크가 끊기면 서버에 반영되지 못했다고 알린다', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const tree = await renderAuthenticated(myPage());
    fetchMock.mockRejectedValueOnce(new Error('Network request failed'));

    await pressLogout(tree);

    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][1]).toBe(
      '네트워크에 연결되지 않아 서버에는 반영되지 못했어요.',
    );
    expect(getAccessToken()).toBeNull();
    alert.mockRestore();
  });

  test('연속으로 두 번 눌러도 요청은 한 번만 나간다', async () => {
    const tree = await renderAuthenticated(myPage());
    fetchMock.mockResolvedValue(jsonResponse(204));

    const [button] = logoutButtons(tree);
    await act(async () => {
      button.props.onPress();
      button.props.onPress();
    });

    // 마운트 시 재발급 1회 + 로그아웃 1회.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('로그아웃이 성공하면 Alert 없이 로그인 화면으로 되돌아간다', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const tree = await renderAuthenticated(myPage());
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    await pressLogout(tree);

    expect(alert).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
    await expect(readRefreshToken()).resolves.toBeNull();
    alert.mockRestore();
  });
});
