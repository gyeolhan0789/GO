/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '../src/features/auth/model/AuthContext';
import { setHasLoggedInBefore } from '../src/shared/lib/loginHistoryStorage';
import { LoginScreen } from '../src/screens/LoginScreen/LoginScreen';

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

const navigation = { navigate: jest.fn(), reset: jest.fn() };

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

beforeEach(() => {
  navigation.navigate.mockClear();
  navigation.reset.mockClear();
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

// 인사 문구는 로그인 이력 조회(useQuery)가 해소된 뒤에야 갱신되므로,
// 마이크로태스크를 반복 flush 하며 원하는 텍스트가 나타날 때까지 기다린다.
async function waitForText(root: ReactTestInstance, text: string) {
  for (let i = 0; i < 10; i += 1) {
    if (collectTexts(root).includes(text)) {
      return;
    }
    await act(async () => {
      await Promise.resolve();
    });
  }
}

async function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <QueryClientProvider client={client}>
          <AuthProvider>
            {/* 화면은 navigation prop만 사용한다. 나머지 props는 테스트에서 불필요. */}
            <LoginScreen
              navigation={navigation as never}
              route={{ key: 'Login', name: 'Login' } as never}
            />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>,
    );
  });
  // 로그인 이력 조회(useQuery)가 마이크로태스크로 해소되도록 한 번 더 flush.
  await act(async () => {
    await Promise.resolve();
  });
  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

describe('LoginScreen', () => {
  test('첫 로그인 사용자는 "만나서 반가워요!"로 맞이한다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('만나서 반가워요!');
    expect(texts).not.toContain('다시 만나서 반가워요!');
    expect(texts).toContain('카카오로 로그인');
    expect(texts).toContain('Google로 로그인');
  });

  test('로그인 이력이 있으면 "다시 만나서 반가워요!"로 맞이한다', async () => {
    await setHasLoggedInBefore();

    const tree = await renderScreen();
    await waitForText(tree.root, '다시 만나서 반가워요!');
    const texts = collectTexts(tree.root);

    expect(texts).toContain('다시 만나서 반가워요!');
    expect(texts).not.toContain('만나서 반가워요!');
  });

  test('빈 값으로 제출하면 검증 오류가 노출된다', async () => {
    const tree = await renderScreen();

    const submit = tree.root.find(
      node => node.props.accessibilityLabel === '로그인',
    );
    await act(async () => {
      submit.props.onPress();
    });

    const texts = collectTexts(tree.root);
    expect(texts).toContain('이메일은 필수입니다.');
    expect(texts).toContain('비밀번호는 필수입니다.');
    expect(navigation.reset).not.toHaveBeenCalled();
  });
});
