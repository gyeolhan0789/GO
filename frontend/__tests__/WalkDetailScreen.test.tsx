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
import { participantColors } from '../src/shared/constants/colors';
import { WalkDetailScreen } from '../src/screens/WalkDetailScreen/WalkDetailScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import {
  buildGameResultDetailResponse,
  MY_CHARACTER_RESPONSE,
} from '../jest/gameResultFixtures';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const ROOM_ID = 12;

const Stack = createNativeStackNavigator<RootStackParamList>();

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async url => {
    if (url.includes('/members/character')) {
      return jsonResponse(200, MY_CHARACTER_RESPONSE);
    }
    if (url.includes(`/game-results/${ROOM_ID}`)) {
      return jsonResponse(200, buildGameResultDetailResponse(ROOM_ID));
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

/** 배경색별 빙고 칸 수. */
/**
 * 칸 색은 참가자 순서로 배정된다(본인이 맨 앞이라 participantColors[0]).
 * 색깔별 칸 수를 세면 누가 몇 칸을 깼는지 그대로 드러난다.
 */
function countCellsByColor(root: ReactTestInstance) {
  const cells = root.findAllByType(BingoCell);
  const completedWith = (color: string) =>
    cells.filter(cell => cell.props.completed && cell.props.color === color)
      .length;

  return {
    me: completedWith(participantColors[0]),
    friend1: completedWith(participantColors[1]),
    friend2: completedWith(participantColors[2]),
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
                initialParams={{ roomId: ROOM_ID }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </QueryClientProvider>,
    );
  });

  // 내 memberId를 먼저 받아온 뒤에야 산책 요청이 나가서 두 번 비운다.
  await flushQueries();
  await flushQueries();

  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

describe('WalkDetailScreen', () => {
  test('어떤 방이었는지 보여준다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('민서와의 산책');
    // 요일은 남기고 시각은 뺀다.
    expect(texts).toContain('협동 · 2026.07.20 (월)');
    expect(texts).toContain('성공');
  });

  test('수치 통계는 두지 않는다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    // 미션·빙고·포인트는 빙고판이 그대로 보여주므로 따로 세지 않는다.
    expect(texts).not.toContain('내 미션');
    expect(texts).not.toContain('포인트');
    expect(texts).not.toContain('12분 31초');
  });

  test('함께한 친구를 아바타와 이름으로 보여준다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('함께한 친구');
    expect(texts).toContain('나');
    expect(texts).toContain('민서');
    expect(texts).toContain('민지');
    // 칸별 완료자는 빙고판이 보여주므로 목록에서는 미션 수를 세지 않는다.
    expect(texts).not.toContain('미션 4개');
  });

  test('친구 아바타는 누를 수 없다', async () => {
    const tree = await renderScreen();

    // 친구를 눌러 그 사람 기록을 보는 기능은 넣지 않는다. 눌리는 요소가 남아 있으면
    // 눌러도 아무 일이 없어 고장난 것처럼 보인다.
    const pressableNames = tree.root
      .findAll(node => typeof node.props.onPress === 'function')
      .map(node => node.props.accessibilityLabel)
      .filter((label): label is string => typeof label === 'string');

    expect(pressableNames).not.toContain('민서 기록 보기');
    expect(pressableNames).not.toContain('민지 기록 보기');
  });

  test('함께 진행한 빙고판을 완료 수와 함께 보여준다', async () => {
    const tree = await renderScreen();

    expect(collectTexts(tree.root)).toContain('진행한 빙고판 6/9');
    // 3x3 판이라 칸은 9개.
    expect(tree.root.findAllByType(BingoCell)).toHaveLength(9);
    // 친구 둘이 각각 다른 색을 받아야 누가 깼는지 구분된다.
    expect(countCellsByColor(tree.root)).toEqual({
      me: 4,
      friend1: 1,
      friend2: 1,
      none: 3,
    });
  });

  test('누가 몇 칸을 깼는지 범례로 바로 보여준다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    // 누가 깼는지가 이 화면의 핵심이라 접어두지 않는다.
    expect(texts).toContain('나');
    expect(texts).toContain('민서');
    expect(texts).toContain('민지');
    expect(texts).toContain('못 깬 칸');
    // 나 4칸, 민서 1칸, 민지 1칸, 못 깬 칸 3칸.
    expect(texts).toContain('4칸');
    expect(texts).toContain('1칸');
    expect(texts).toContain('3칸');
  });

  test('불러오지 못하면 오류를 알린다', async () => {
    fetchMock.mockImplementation(async url =>
      url.includes('/members/character')
        ? jsonResponse(200, MY_CHARACTER_RESPONSE)
        : jsonResponse(500, null),
    );
    const tree = await renderScreen();

    expect(collectTexts(tree.root)).toContain('산책 기록을 불러오지 못했어요.');
  });
});
