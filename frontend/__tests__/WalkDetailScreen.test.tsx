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
import { BingoCell } from '../src/features/bingo/components/BingoCell/BingoCell';
import { colors } from '../src/shared/constants/colors';
import { WalkDetailScreen } from '../src/screens/WalkDetailScreen/WalkDetailScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import { buildWalkSessionDetailResponse } from '../jest/walkSessionFixtures';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const WALK_SESSION_ID = 12;

const Stack = createNativeStackNavigator<RootStackParamList>();

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async url => {
    if (url.includes(`/walk-sessions/${WALK_SESSION_ID}`)) {
      return jsonResponse(200, buildWalkSessionDetailResponse(WALK_SESSION_ID));
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
 * 칸은 '이번 산책에 깼는지'로 갈린다. 색깔별 칸 수를 세면 이번 산책의 몫과
 * 지난 산책에서 이미 깬 칸이 섞이지 않았는지 그대로 드러난다.
 */
function countCellsByColor(root: ReactTestInstance) {
  const cells = root.findAllByType(BingoCell);
  const completedWith = (color: string) =>
    cells.filter(cell => cell.props.completed && cell.props.color === color)
      .length;

  return {
    session: completedWith(colors.primary),
    before: completedWith(colors.muted),
    none: cells.filter(cell => !cell.props.completed).length,
  };
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
              <Stack.Screen
                name="WalkDetail"
                component={WalkDetailScreen}
                initialParams={{ walkSessionId: WALK_SESSION_ID }}
              />
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

describe('WalkDetailScreen', () => {
  test('언제 어느 방에서 걸었는지 보여준다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('민서와의 산책');
    expect(texts).toContain('협동 · 2026.07.20 (월)');
  });

  test('산책을 시작하고 종료한 시각을 보여준다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('시작');
    expect(texts).toContain('종료');
    // 서버가 준 11:00Z / 11:32Z를 기기 시간대(KST)로 옮겨 읽어야 한다.
    expect(texts).toContain('20:00');
    expect(texts).toContain('20:32');
  });

  test('나가 있던 총 시간과 걸은 시간을 따로 적는다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    // 시작~종료는 32분이지만 그중 4분을 쉬었다. 둘을 같은 값으로 두면
    // 쉰 시간이 운동 시간으로 둔갑한다.
    expect(texts).toContain('총 32분');
    expect(texts).toContain('28분');
  });

  test('그 산책의 걸음·거리·칼로리·시간을 보여준다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('3,240');
    expect(texts).toContain('2.4');
    expect(texts).toContain('118');
    // 쉰 시간을 뺀 28분이다. 시작~종료(32분)를 쓰면 실제보다 길어진다.
    expect(texts).toContain('28분');
  });

  test('이번 산책에 깬 칸만 진행 수로 센다', async () => {
    const tree = await renderScreen();

    // 판에는 승인된 칸이 넷이지만 이번 산책의 몫은 둘뿐이다.
    expect(collectTexts(tree.root)).toContain('진행한 빙고판 2/9');
    expect(tree.root.findAllByType(BingoCell)).toHaveLength(9);
    expect(countCellsByColor(tree.root)).toEqual({
      session: 2,
      before: 2,
      none: 5,
    });
  });

  test('지난 산책에서 깬 칸을 범례로 구분해 준다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('이번 산책');
    expect(texts).toContain('지난 산책');
    expect(texts).toContain('못 깬 칸');
    // 이번 2칸, 지난 2칸, 못 깬 5칸.
    expect(texts).toContain('2칸');
    expect(texts).toContain('5칸');
  });

  test('이번 산책에 깬 미션을 제목과 시각으로 적는다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    // 판에서 깬 칸은 0번과 3번, 즉 '미션 1'과 '미션 4'다.
    expect(texts).toContain('이번 산책에 깬 미션');
    expect(texts).toContain('미션 1');
    expect(texts).toContain('미션 4');
    // 11:10Z를 기기 시간대(KST)로 옮긴 값이다.
    expect(texts).toContain('20:10');
  });

  test('지난 산책에서 깬 칸은 이번 목록에 넣지 않는다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    // 1번과 8번 칸도 승인됐지만 이번 산책의 몫이 아니다. 판에는 그대로 남아
    // 있으므로 '안 보인다'가 아니라 '판에만 있고 목록엔 없다'로 가른다.
    const countOf = (label: string) =>
      texts.filter(text => text === label).length;

    // 이번에 깬 칸은 판과 목록 양쪽에 선다.
    expect(countOf('미션 1')).toBe(2);
    expect(countOf('미션 4')).toBe(2);
    // 지난 산책 몫과 못 깬 칸은 판에만 있다.
    expect(countOf('미션 2')).toBe(1);
    expect(countOf('미션 9')).toBe(1);
  });

  test('참가자 목록은 두지 않는다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    // 산책 한 번은 내 기록이라 누구와 걸었는지는 서버가 내려주지 않는다.
    expect(texts).not.toContain('함께한 친구');
    expect(texts).not.toContain('민서');
  });

  test('불러오지 못하면 오류를 알린다', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(500, null));
    const tree = await renderScreen();

    expect(collectTexts(tree.root)).toContain('산책 기록을 불러오지 못했어요.');
  });
});
