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

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;

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
function loadedWalks(root: ReactTestInstance): { walkId: number }[] {
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

/** Select는 트리거와 항목에 `${name} ${label}` 형태의 접근성 라벨을 달아둔다. */
async function selectOption(
  root: ReactTestInstance,
  name: string,
  label: string,
) {
  const trigger = root.find(
    node =>
      typeof node.props.accessibilityLabel === 'string' &&
      node.props.accessibilityLabel.startsWith(`${name} `) &&
      node.props.accessibilityRole === 'button',
  );

  await act(async () => {
    trigger.props.onPress();
  });

  const option = root.find(
    node => node.props.accessibilityLabel === `${name} ${label} 선택`,
  );

  await act(async () => {
    option.props.onPress();
  });
  await flushQueries();
  await flushQueries();
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

    // 끝에 닿은 뒤 더 스크롤해도 개수가 늘지 않는다.
    await scrollToEnd(tree.root);
    expect(loadedWalks(tree.root)).toHaveLength(27);
  });

  test('이어 붙인 목록에 중복이 없다', async () => {
    const tree = await renderScreen();
    await scrollToEnd(tree.root);
    await scrollToEnd(tree.root);

    const ids = loadedWalks(tree.root).map(walk => walk.walkId);

    expect(ids).toHaveLength(27);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('다 불러오기 전에는 끝 안내를 띄우지 않는다', async () => {
    const tree = await renderScreen();

    expect(collectTexts(tree.root)).not.toContain('기록을 모두 봤어요');
  });

  test('기간·인원·정렬 세 버튼이 기본값으로 놓여 있다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('전체 기간');
    expect(texts).toContain('모든 산책');
    expect(texts).toContain('최신순');
  });

  test('기간을 고르면 실제 날짜 구간이 버튼에 뜬다', async () => {
    const tree = await renderScreen();

    // 프리셋 이름('최근 7일')이 아니라 그게 풀린 날짜를 보여줘야 한다.
    await selectOption(tree.root, '기간', '최근 7일');

    const texts = collectTexts(tree.root);
    expect(texts).not.toContain('전체 기간');
    expect(
      texts.some(text => /^\d{4}\.\d{2}\.\d{2} ~ \d{4}\.\d{2}\.\d{2}$/.test(text)),
    ).toBe(true);
  });

  test('기간을 좁히면 목록도 줄어든다', async () => {
    const tree = await renderScreen();
    const allTime = loadedWalks(tree.root).length;

    // 목업은 오늘 기준이 아니라 고정 날짜라, 최근 7일에는 아무것도 안 걸린다.
    await selectOption(tree.root, '기간', '최근 7일');

    expect(loadedWalks(tree.root).length).toBeLessThan(allTime);
    expect(collectTexts(tree.root)).toContain('조건에 맞는 산책이 없어요.');
  });

  test('인원 필터를 걸면 조건에 맞는 산책만 남는다', async () => {
    const tree = await renderScreen();

    await selectOption(tree.root, '인원', '혼자 산책');

    const walks = loadedWalks(tree.root);
    // 전체 27건 중 혼자 걸은 건 9건.
    expect(walks).toHaveLength(9);
    expect(collectTexts(tree.root)).toContain('기록을 모두 봤어요');
  });

  test('정렬을 바꾸면 첫 항목이 달라진다', async () => {
    const tree = await renderScreen();
    const latestFirst = loadedWalks(tree.root)[0].walkId;

    await selectOption(tree.root, '정렬', '오래된순');

    expect(loadedWalks(tree.root)[0].walkId).not.toBe(latestFirst);
  });

  test('조건을 바꾸면 쌓아둔 페이지를 버리고 첫 페이지부터 다시 받는다', async () => {
    const tree = await renderScreen();

    await scrollToEnd(tree.root);
    expect(loadedWalks(tree.root)).toHaveLength(20);

    // 조건이 바뀌면 페이지 번호의 의미가 달라지므로 이어 붙이면 안 된다.
    await selectOption(tree.root, '정렬', '오래된순');
    expect(loadedWalks(tree.root)).toHaveLength(10);
  });

  test('조건에 맞는 산책이 없으면 그렇다고 알려준다', async () => {
    const tree = await renderScreen();

    // '혼자'로 걸러도 9건이 남으니, 빈 목록 문구는 필터가 걸린 상태의 문구여야 한다.
    await selectOption(tree.root, '인원', '혼자 산책');

    expect(collectTexts(tree.root)).not.toContain('아직 산책 기록이 없어요.');
  });
});
