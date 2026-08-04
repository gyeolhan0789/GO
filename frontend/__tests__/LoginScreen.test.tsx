/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { ActivityIndicator, Text } from 'react-native';
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

// 화면이 회원가입 이동 펜딩을 되돌릴 때 focus 리스너를 쓴다. 해제 함수까지 돌려준다.
const navigation = {
  navigate: jest.fn(),
  reset: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
};

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

/** 라벨은 TextInput과 그 호스트 노드에 모두 실린다. 바깥쪽 하나만 쓴다. */
function findInput(root: ReactTestInstance, label: string) {
  const [input] = root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onChangeText === 'function',
  );

  if (!input) {
    throw new Error(`${label} 입력창을 찾지 못했다.`);
  }
  return input;
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

  test('이메일에 붙은 앞뒤 공백은 입력 즉시 지운다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findInput(tree.root, '이메일 주소').props.onChangeText(
        '  go@example.com  ',
      );
    });

    expect(findInput(tree.root, '이메일 주소').props.value).toBe(
      'go@example.com',
    );
  });

  test('비밀번호의 공백은 자격 증명이라 건드리지 않는다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findInput(tree.root, '비밀번호').props.onChangeText(' abcd1234! ');
    });

    expect(findInput(tree.root, '비밀번호').props.value).toBe(' abcd1234! ');
  });

  test('회원가입 링크는 눌리면 스피너로 바뀌고 두 번 눌려도 한 번만 이동한다', async () => {
    const tree = await renderScreen();
    const findSignupLinks = () =>
      // deep: false — Pressable 합성 인스턴스와 그 아래 host View가 같은 props를
      // 물고 있어서, 옵션 없이 findAll하면 같은 버튼이 2개로 잡힌다.
      tree.root.findAll(node => node.props.accessibilityLabel === '회원가입', {
        deep: false,
      });

    expect(findSignupLinks()).toHaveLength(1);

    // 누르면 링크가 스피너로 교체되므로, 핸들러를 미리 잡아두고 두 번 호출해야
    // 같은 프레임 연타를 재현할 수 있다.
    const press = findSignupLinks()[0].props.onPress;
    await act(async () => {
      press();
      press();
    });

    // 이동 중에는 링크가 사라지고 그 자리에 스피너가 남는다.
    expect(findSignupLinks()).toHaveLength(0);
    expect(tree.root.findAllByType(ActivityIndicator).length).toBeGreaterThan(0);

    // 스피너를 먼저 그리려고 navigate를 한 프레임(requestAnimationFrame) 미룬다.
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), 0);
      });
    });

    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith('Signup');
  });
});
