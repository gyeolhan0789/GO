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
import {
  isSamsungHealthAvailable,
  requestSamsungHealthPermissions,
} from '../src/shared/lib/samsungHealth';

const HEALTH_CARD_TITLE = '건강 데이터';

/** 삼성헬스가 깔려 있는 기기(갤럭시)로 만든다. */
function withSamsungHealth() {
  (isSamsungHealthAvailable as jest.Mock).mockResolvedValue(true);
}

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

// jest에는 네이티브 모듈이 없어서, 삼성헬스가 깔린 기기와 없는 기기를 테스트마다
// 갈아 끼운다.
jest.mock('../src/shared/lib/samsungHealth', () => ({
  isSamsungHealthAvailable: jest.fn(() => Promise.resolve(false)),
  hasSamsungHealthPermissions: jest.fn(() => Promise.resolve(false)),
  requestSamsungHealthPermissions: jest.fn(() => Promise.resolve(true)),
}));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

beforeEach(() => {
  mockReset.mockClear();
  (requestAllPermissions as jest.Mock).mockClear();
  (requestSamsungHealthPermissions as jest.Mock).mockClear();
  // 기본은 삼성헬스가 없는 기기다.
  (isSamsungHealthAvailable as jest.Mock).mockResolvedValue(false);
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

  test('삼성헬스가 없는 기기에는 건강 데이터 카드를 띄우지 않는다', async () => {
    const tree = await renderScreen();

    // 물어봐도 SDK가 거절해서 영구히 '거부됨'으로 남는다. 이런 기기는 기기 걸음
    // 센서로 대체하므로 아예 안 묻는다.
    expect(collectTexts(tree.root)).not.toContain(HEALTH_CARD_TITLE);
  });

  test('삼성헬스가 없으면 허용 버튼을 눌러도 삼성헬스 권한을 요청하지 않는다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      tree.root
        .find(node => node.props.accessibilityLabel === '권한 허용하기')
        .props.onPress();
    });

    expect(requestAllPermissions).toHaveBeenCalledTimes(1);
    expect(requestSamsungHealthPermissions).not.toHaveBeenCalled();
  });

  test('삼성헬스가 있는 기기에는 건강 데이터 카드를 띄우고 함께 요청한다', async () => {
    withSamsungHealth();
    const tree = await renderScreen();

    expect(collectTexts(tree.root)).toContain(HEALTH_CARD_TITLE);

    await act(async () => {
      tree.root
        .find(node => node.props.accessibilityLabel === '권한 허용하기')
        .props.onPress();
    });

    expect(requestSamsungHealthPermissions).toHaveBeenCalledTimes(1);
  });
});
