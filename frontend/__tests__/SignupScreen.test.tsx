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
import { SignupScreen } from '../src/screens/SignupScreen/SignupScreen';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const navigation = { goBack: jest.fn() };

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

afterEach(() => {
  navigation.goBack.mockClear();
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
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <QueryClientProvider client={client}>
          {/* 소셜 로그인 성공 시 세션을 시작하므로 AuthProvider가 필요하다. */}
          <AuthProvider>
            {/* 화면은 navigation prop만 사용한다. 나머지 props는 테스트에서 불필요. */}
            <SignupScreen
              navigation={navigation as never}
              route={{ key: 'Signup', name: 'Signup' } as never}
            />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>,
    );
  });
  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

describe('SignupScreen', () => {
  test('폼 필드와 소셜 로그인 버튼이 노출된다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('이메일 주소');
    expect(texts).toContain('비밀번호');
    expect(texts).toContain('비밀번호 확인');
    expect(texts).toContain('닉네임');
    expect(texts).toContain('지역');
    expect(texts).toContain('성별');
    expect(texts).toContain('카카오로 시작하기');
    expect(texts).toContain('Google로 시작하기');
  });

  test('빈 값으로 제출하면 검증 오류가 노출된다', async () => {
    const tree = await renderScreen();

    const submit = tree.root.find(
      node => node.props.accessibilityLabel === '회원가입',
    );
    await act(async () => {
      submit.props.onPress();
    });

    const texts = collectTexts(tree.root);
    expect(texts).toContain('이메일은 필수입니다.');
    expect(texts).toContain('비밀번호는 필수입니다.');
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});
