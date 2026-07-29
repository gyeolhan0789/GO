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

function findByAccessibilityLabel(root: ReactTestInstance, label: string) {
  return root.find(node => node.props.accessibilityLabel === label);
}

/** 배경색별 빙고 칸 수. */
function countCellsByColor(root: ReactTestInstance) {
  const cells = root.findAllByType(BingoCell);

  return {
    mine: cells.filter(
      cell => cell.props.completed && cell.props.color === colors.successBg,
    ).length,
    other: cells.filter(
      cell =>
        cell.props.completed && cell.props.color === colors.highlightSoftBg,
    ).length,
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
                initialParams={{ walkId: 1 }}
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
  test('산책 정보와 내 기록이 보인다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('민서와의 산책');
    expect(texts).toContain('2026.07.20 (월) 20:00 - 20:13');

    // 수치는 늘 본인 것이다.
    expect(texts).toContain('4,231');
    expect(texts).toContain('12분 31초');
    expect(texts).toContain('3.2');
    expect(texts).toContain('176');
    expect(texts).toContain('걸음');
    expect(texts).toContain('거리');
    expect(texts).toContain('칼로리');
  });

  test('함께한 친구를 모두 보여준다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('함께한 친구');
    expect(texts).toContain('나');
    expect(texts).toContain('민서');
    expect(texts).toContain('민지');
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
    // 내가 4칸, 다른 사람이 2칸, 남은 3칸은 미완료.
    expect(countCellsByColor(tree.root)).toEqual({
      mine: 4,
      other: 2,
      none: 3,
    });
  });

  test('정보 버튼을 누르면 색 설명이 열린다', async () => {
    const tree = await renderScreen();

    expect(collectTexts(tree.root)).not.toContain('다른 친구 완료');

    await act(async () => {
      findByAccessibilityLabel(tree.root, '빙고판 색 설명').props.onPress();
    });

    const texts = collectTexts(tree.root);
    expect(texts).toContain('내가 완료');
    expect(texts).toContain('다른 친구 완료');
    expect(texts).toContain('아직 미완료');
  });
});
