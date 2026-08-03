/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { RootStackParamList } from '../src/app/navigation/RootNavigator';
import { AuthProvider } from '../src/features/auth/model/AuthContext';
import { MyPageScreen } from '../src/screens/MyPageScreen/MyPageScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';

// 로그아웃 버튼이 useAuth를 타므로 AuthProvider가 필요하다. 저장된 리프레시
// 토큰이 없는 기기라 세션 복구는 요청 없이 끝난다.
jest.mock('react-native-keychain', () =>
  require('../jest/keychainMock').createKeychainMock(),
);

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const NICKNAME = '산책이 좋아';
const CHARACTER = {
  memberId: 1,
  nickname: NICKNAME,
  gender: 'MALE',
  defaultImageUrl: '/uploads/characters/male.png',
  equippedItems: [],
};

const CUSTOMIZE_MARKER = '꾸미기 화면';
const SENT_REQUESTS_MARKER = '친구 추가 내역 화면';

const Stack = createNativeStackNavigator<RootStackParamList>();

function CharacterCustomizeStub() {
  return <Text>{CUSTOMIZE_MARKER}</Text>;
}

function SentFriendRequestsStub() {
  return <Text>{SENT_REQUESTS_MARKER}</Text>;
}

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async url => {
    if (url.includes('/members/avatar')) {
      return jsonResponse(200, CHARACTER);
    }
    if (url.includes('/members/me')) {
      return jsonResponse(204);
    }
    throw new Error(`unexpected request: ${url}`);
  });
});

afterEach(() => {
  if (renderer) {
    act(() => {
      renderer?.unmount();
    });
    renderer = null;
  }
  // 안 비우면 react-query gc 타이머가 살아남아 워커가 안 죽는다.
  queryClient?.clear();
  queryClient = null;
});

/** react-query는 알림을 setTimeout으로 모아 보내서 타이머까지 흘려보내야 한다. */
async function flushQueries() {
  await act(async () => {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 0);
    });
  });
}

function collectTexts(root: ReactTestInstance): string[] {
  return root
    .findAllByType(Text)
    .flatMap(node => {
      const children = node.props.children;
      return Array.isArray(children) ? children : [children];
    })
    .filter((child): child is string => typeof child === 'string');
}

function findByAccessibilityLabel(root: ReactTestInstance, label: string) {
  return root.find(node => node.props.accessibilityLabel === label);
}

/** 공용 `Button`은 접근성 라벨 대신 자식 Text로 이름을 드러낸다. */
function findButtonByText(root: ReactTestInstance, text: string) {
  let current: ReactTestInstance | null = root.find(
    node => node.type === Text && node.props.children === text,
  ).parent;

  while (current) {
    if (typeof current.props.onPress === 'function') {
      return current;
    }
    current = current.parent;
  }

  throw new Error(`${text} 버튼을 찾지 못했다.`);
}

async function typeNickname(root: ReactTestInstance, value: string) {
  await act(async () => {
    findByAccessibilityLabel(root, '닉네임').props.onChangeText(value);
  });
}

async function renderScreen() {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      // `QueryClient.clear()`는 mutation의 gc 타이머를 정리하지 않는다. 언마운트
      // 때 걸리는 기본 5분 타이머를 0으로 줄여 워커가 매달려 있지 않게 한다.
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const client = queryClient;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
            <NavigationContainer>
              <Stack.Navigator>
                <Stack.Screen name="MyPage" component={MyPageScreen} />
                <Stack.Screen
                  name="CharacterCustomize"
                  component={CharacterCustomizeStub}
                />
                <Stack.Screen
                  name="SentFriendRequests"
                  component={SentFriendRequestsStub}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaProvider>
        </AuthProvider>
      </QueryClientProvider>,
    );
  });

  await flushQueries();

  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

function patchedNickname() {
  const [, options] =
    fetchMock.mock.calls.find(([url]) => url.includes('/members/me')) ?? [];

  return JSON.parse(String(options?.body)).nickname;
}

describe('MyPageScreen', () => {
  test('서버에 저장된 닉네임을 입력창에 채워 보여준다', async () => {
    const tree = await renderScreen();

    expect(findByAccessibilityLabel(tree.root, '닉네임').props.value).toBe(
      NICKNAME,
    );
  });

  test('닉네임을 바꾸지 않았거나 길이 규칙에 어긋나면 저장할 수 없다', async () => {
    const tree = await renderScreen();

    expect(findButtonByText(tree.root, '저장하기').props.disabled).toBe(true);

    await typeNickname(tree.root, '곰');

    expect(findButtonByText(tree.root, '저장하기').props.disabled).toBe(true);
  });

  test('바꾼 닉네임을 저장하면 앞뒤 공백을 떼고 전송한다', async () => {
    const tree = await renderScreen();

    await typeNickname(tree.root, '  걷는곰  ');
    await act(async () => {
      findButtonByText(tree.root, '저장하기').props.onPress();
    });
    await flushQueries();

    expect(patchedNickname()).toBe('걷는곰');
  });

  test('캐릭터 변경하기를 누르면 꾸미기 화면으로 이동한다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findByAccessibilityLabel(tree.root, '캐릭터 변경하기').props.onPress();
    });

    expect(collectTexts(tree.root)).toContain(CUSTOMIZE_MARKER);
  });

  test('친구 추가 내역을 누르면 보낸 요청 화면으로 이동한다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findByAccessibilityLabel(tree.root, '친구 추가 내역').props.onPress();
    });

    expect(collectTexts(tree.root)).toContain(SENT_REQUESTS_MARKER);
  });
});
