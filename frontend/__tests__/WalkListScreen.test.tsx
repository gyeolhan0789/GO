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
import { WalkCard } from '../src/features/history/components/WalkCard/WalkCard';
import { WalkListScreen } from '../src/screens/WalkListScreen/WalkListScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import { buildGameResultSlice } from '../jest/gameResultFixtures';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;

/** 서버가 가지고 있는 산책 수. 10건씩 세 페이지로 나뉜다. */
let totalWalks = 27;

beforeEach(() => {
  totalWalks = 27;
  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async url => {
    if (url.includes('/game-results')) {
      const page = Number(/page=(\d+)/.exec(url)?.[1]);
      const size = Number(/size=(\d+)/.exec(url)?.[1]);
      return jsonResponse(200, buildGameResultSlice(page, size, totalWalks));
    }
    throw new Error(`예상하지 못한 요청: ${url}`);
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

/**
 * 렌더된 WalkCard를 세면 안 된다 — FlatList는 initialNumToRender(기본 10)만 그리고
 * 테스트 렌더러엔 뷰포트가 없어 그 이상 늘지 않는다. data가 진실이다.
 */
function loadedWalks(root: ReactTestInstance): { gameId: number }[] {
  const [list] = root.findAll(
    node => typeof node.props.onEndReached === 'function' && !!node.props.data,
  );

  return list.props.data;
}

async function renderScreen() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const client = queryClient;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="WalkList" component={WalkListScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </QueryClientProvider>,
    );
  });

  await flushQueries();

  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

/** 테스트 렌더러는 실제 스크롤을 못 하므로 onScroll을 직접 쏜다. */
async function scrollTo(root: ReactTestInstance, offsetY: number) {
  const [list] = root.findAll(
    node => typeof node.props.onEndReached === 'function' && !!node.props.data,
  );

  await act(async () => {
    list.props.onScroll({ nativeEvent: { contentOffset: { y: offsetY } } });
  });
}

/**
 * accessibilityLabel은 Fab -> Pressable -> View로 그대로 내려가 한 버튼이 여러
 * 노드로 잡힌다. 개수를 세면 컴포넌트 구조가 바뀔 때마다 깨지므로 유무만 본다.
 */
function hasScrollToTopButton(root: ReactTestInstance): boolean {
  return root.findAll(node => node.props.accessibilityLabel === '맨 위로')
    .length > 0;
}

async function pressScrollToTop(root: ReactTestInstance) {
  const [button] = root.findAll(
    node =>
      node.props.accessibilityLabel === '맨 위로' &&
      typeof node.props.onPress === 'function',
  );

  await act(async () => {
    button.props.onPress();
  });
}

/** 화면 끝까지 스크롤한 것과 같은 효과. FlatList의 onEndReached를 직접 쏜다. */
async function scrollToEnd(root: ReactTestInstance) {
  const [list] = root.findAll(
    node => typeof node.props.onEndReached === 'function' && !!node.props.data,
  );

  if (!list) {
    throw new Error('onEndReached를 가진 리스트를 찾지 못했다.');
  }

  await act(async () => {
    list.props.onEndReached();
  });
  // 요청 -> 응답 -> 반영이 각각 타이머를 타므로 여러 번 비운다.
  await flushQueries();
  await flushQueries();
}

describe('WalkListScreen', () => {
  test('첫 페이지 10건을 불러와 카드로 그린다', async () => {
    const tree = await renderScreen();

    expect(loadedWalks(tree.root)).toHaveLength(10);
    expect(tree.root.findAllByType(WalkCard).length).toBeGreaterThan(0);
    expect(collectTexts(tree.root)).toContain('민서와의 산책');
  });

  test('첫 요청은 0페이지부터 정해진 크기로 나간다', async () => {
    await renderScreen();

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/game-results?page=0&size=10',
    );
  });

  test('끝까지 스크롤하면 다음 페이지가 이어 붙는다', async () => {
    const tree = await renderScreen();

    await scrollToEnd(tree.root);
    expect(loadedWalks(tree.root)).toHaveLength(20);

    await scrollToEnd(tree.root);
    // 전체 27건이라 세 번째 페이지에서 7건만 더 붙는다.
    expect(loadedWalks(tree.root)).toHaveLength(27);
  });

  test('다 불러오면 더 부르지 않고 끝을 알린다', async () => {
    const tree = await renderScreen();

    await scrollToEnd(tree.root);
    await scrollToEnd(tree.root);
    expect(collectTexts(tree.root)).toContain('기록을 모두 봤어요');

    const callCount = fetchMock.mock.calls.length;

    // 끝에 닿은 뒤 더 스크롤해도 요청도 개수도 늘지 않는다.
    await scrollToEnd(tree.root);
    expect(loadedWalks(tree.root)).toHaveLength(27);
    expect(fetchMock.mock.calls).toHaveLength(callCount);
  });

  test('이어 붙인 목록에 중복이 없다', async () => {
    const tree = await renderScreen();
    await scrollToEnd(tree.root);
    await scrollToEnd(tree.root);

    const ids = loadedWalks(tree.root).map(walk => walk.gameId);

    expect(ids).toHaveLength(27);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('다 불러오기 전에는 끝 안내를 띄우지 않는다', async () => {
    const tree = await renderScreen();

    expect(collectTexts(tree.root)).not.toContain('기록을 모두 봤어요');
  });

  test('기록이 하나도 없으면 그렇다고 알려준다', async () => {
    totalWalks = 0;
    const tree = await renderScreen();

    expect(collectTexts(tree.root)).toContain('아직 산책 기록이 없어요.');
  });

  test('불러오지 못하면 오류를 알린다', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(500, null));
    const tree = await renderScreen();

    expect(collectTexts(tree.root)).toContain('산책 기록을 불러오지 못했어요.');
  });

  test('맨 위에서는 맨 위로 버튼을 띄우지 않는다', async () => {
    const tree = await renderScreen();

    expect(hasScrollToTopButton(tree.root)).toBe(false);
  });

  test('한참 내려가면 맨 위로 버튼이 나왔다가, 올라오면 사라진다', async () => {
    const tree = await renderScreen();

    await scrollTo(tree.root, 900);
    expect(hasScrollToTopButton(tree.root)).toBe(true);

    await scrollTo(tree.root, 0);
    expect(hasScrollToTopButton(tree.root)).toBe(false);
  });

  test('맨 위로 버튼을 누르면 목록을 처음으로 되돌린다', async () => {
    const tree = await renderScreen();
    await scrollTo(tree.root, 900);

    const [list] = tree.root.findAll(
      node =>
        typeof node.props.onEndReached === 'function' && !!node.props.data,
    );
    const scrollToOffset = jest.fn();
    list.instance.scrollToOffset = scrollToOffset;

    await pressScrollToTop(tree.root);

    expect(scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
  });

  test('서버가 조건을 받지 않으므로 거르는 손잡이를 두지 않는다', async () => {
    const tree = await renderScreen();

    // 받아온 페이지에서 걸러내면 페이지 경계에서 개수와 순서가 어긋난다.
    const texts = collectTexts(tree.root);
    expect(texts).not.toContain('전체 기간');
    expect(texts).not.toContain('모든 산책');
    expect(texts).not.toContain('최신순');
  });
});
