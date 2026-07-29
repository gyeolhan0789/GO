/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import type { KeychainMock } from '../jest/keychainMock';
import { RootNavigator } from '../src/app/navigation/RootNavigator';
import { AuthProvider } from '../src/features/auth/model/AuthContext';
import { setAccessToken } from '../src/shared/api/accessTokenStore';
import { saveRefreshToken } from '../src/shared/api/refreshTokenStore';
import { setOnboardingCompleted } from '../src/shared/lib/onboardingStorage';
import { setPermissionsCompleted } from '../src/shared/lib/permissionsStorage';

jest.mock('react-native-keychain', () =>
  require('../jest/keychainMock').createKeychainMock(),
);
const keychain: KeychainMock = jest.requireMock('react-native-keychain');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

const {
  clearAllMockStorages,
} = require('@react-native-async-storage/async-storage/jest');

// 권한 게이트를 이미 통과한 기기를 흉내낸다.
jest.mock('../src/shared/lib/permissions', () => ({
  PERMISSION_KEYS: ['camera', 'activityRecognition', 'location', 'notifications'],
  checkPermission: jest.fn(() => Promise.resolve(true)),
  areAllPermissionsGranted: jest.fn(() => Promise.resolve(true)),
  requestAllPermissions: jest.fn(),
  openAppSettings: jest.fn(),
}));

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
  clearAllMockStorages();
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

function collectTexts(root: ReactTestInstance): string[] {
  return root
    .findAllByType(Text)
    .flatMap(node => {
      const children = node.props.children;
      return Array.isArray(children) ? children : [children];
    })
    .filter((child): child is string => typeof child === 'string');
}

async function flush() {
  for (let i = 0; i < 10; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

/** 온보딩·권한을 이미 통과하고 로그인까지 된 기기에서 앱을 켠 상태. */
async function renderAppSignedIn() {
  await setOnboardingCompleted();
  await setPermissionsCompleted();
  await saveRefreshToken('stored-refresh');
  fetchMock.mockResolvedValueOnce(
    jsonResponse(200, {
      accessToken: 'access-token',
      refreshToken: 'rotated-refresh',
    }),
  );

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>,
    );
  });
  await flush();

  if (!renderer) {
    throw new Error('renderer not initialized');
  }

  return renderer;
}

async function pressLogout(tree: ReactTestRenderer.ReactTestRenderer) {
  const [button] = tree.root.findAll(
    node => node.props.accessibilityLabel === '로그아웃',
    { deep: false },
  );

  await act(async () => {
    button.props.onPress();
  });
  await flush();
}

// TODO: 로그아웃 버튼이 마이페이지로 옮겨가면 그 화면 기준으로 이 테스트들을
// 되살린다. HomeScreen에는 현재 누를 수 있는 로그아웃 버튼이 없다.
describe.skip('로그아웃 후 진입 화면', () => {
  test('로그아웃하면 온보딩이 아니라 로그인 화면으로 간다', async () => {
    const tree = await renderAppSignedIn();
    expect(collectTexts(tree.root)).toContain('오늘 걸음');

    fetchMock.mockResolvedValueOnce(jsonResponse(204));
    await pressLogout(tree);

    const texts = collectTexts(tree.root);
    expect(texts).toContain('만나서 반가워요!');
    expect(texts).not.toContain('건너뛰기');
  });

  test('로그아웃이 실패해도 로그인 화면으로 간다', async () => {
    const tree = await renderAppSignedIn();

    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { message: '토큰이 만료되었습니다.' }),
    );
    await pressLogout(tree);

    const texts = collectTexts(tree.root);
    expect(texts).toContain('만나서 반가워요!');
    expect(texts).not.toContain('건너뛰기');
  });
});
