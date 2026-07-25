/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OnboardingScreen } from '../src/screens/OnboardingScreen/OnboardingScreen';
import {
  getOnboardingCompleted,
  setOnboardingCompleted,
} from '../src/shared/lib/onboardingStorage';

const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ reset: mockReset }),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

const {
  clearAllMockStorages,
} = require('@react-native-async-storage/async-storage/jest');

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

beforeEach(() => {
  mockReset.mockClear();
  clearAllMockStorages();
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
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <OnboardingScreen />
      </SafeAreaProvider>,
    );
  });
  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

describe('onboardingStorage', () => {
  test('완료 전에는 false, 저장 후에는 true를 반환한다', async () => {
    expect(await getOnboardingCompleted()).toBe(false);
    await setOnboardingCompleted();
    expect(await getOnboardingCompleted()).toBe(true);
  });
});

describe('OnboardingScreen', () => {
  test('첫 슬라이드(강조 키워드)와 컨트롤이 노출된다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts.some(t => t.includes('함께'))).toBe(true); // 첫 슬라이드 제목 키워드
    expect(texts).toContain('다음');
    expect(texts).toContain('건너뛰기');
  });

  test('건너뛰기를 누르면 권한(Permissions) 화면으로 이동한다', async () => {
    const tree = await renderScreen();
    const skipButton = tree.root.find(
      node => node.props.accessibilityLabel === '온보딩 건너뛰기',
    );

    await act(async () => {
      skipButton.props.onPress();
    });

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Permissions' }],
    });
  });
});
