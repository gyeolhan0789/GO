/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PermissionsScreen } from '../src/screens/PermissionsScreen/PermissionsScreen';
import { requestAllPermissions } from '../src/shared/lib/permissions';

const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ reset: mockReset }),
}));

jest.mock('../src/shared/lib/permissions', () => ({
  PERMISSION_KEYS: ['camera', 'activityRecognition', 'location', 'notifications'],
  checkPermission: jest.fn(() => Promise.resolve(false)),
  // 완료 저장(usePermissionsStatus)이 진입 게이트용으로 함께 조회한다.
  areAllPermissionsGranted: jest.fn(() => Promise.resolve(false)),
  requestAllPermissions: jest.fn(() =>
    Promise.resolve({
      camera: 'granted',
      activityRecognition: 'granted',
      location: 'granted',
      notifications: 'granted',
    }),
  ),
  openAppSettings: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

beforeEach(() => {
  mockReset.mockClear();
  (requestAllPermissions as jest.Mock).mockClear();
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

async function renderScreen() {
  // 화면이 완료 저장에 usePermissionsStatus(react-query)를 쓴다.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <QueryClientProvider client={client}>
          <PermissionsScreen />
        </QueryClientProvider>
      </SafeAreaProvider>,
    );
  });
  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

describe('PermissionsScreen', () => {
  test('권한 카드와 허용 버튼이 노출된다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('카메라');
    expect(texts).toContain('걸음 수');
    expect(texts).toContain('알림');
    expect(texts).toContain('권한 허용하기');
  });

  test('허용 버튼을 누르면 권한을 요청하고, 이후 시작하기로 로그인에 진입한다', async () => {
    const tree = await renderScreen();

    const allowButton = tree.root.find(
      node => node.props.accessibilityLabel === '권한 허용하기',
    );
    await act(async () => {
      allowButton.props.onPress();
    });
    expect(requestAllPermissions).toHaveBeenCalledTimes(1);

    const startButton = tree.root.find(
      node => node.props.accessibilityLabel === '시작하기',
    );
    await act(async () => {
      startButton.props.onPress();
    });
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  });
});
