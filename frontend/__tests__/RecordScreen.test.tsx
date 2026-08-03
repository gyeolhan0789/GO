/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BarChart, ProgressChart } from 'react-native-chart-kit';

import { WalkCard } from '../src/features/history/components/WalkCard/WalkCard';
import { RECENT_WALK_LIMIT } from '../src/features/history/hooks/useRecentWalksQuery';
import { RecordScreen } from '../src/screens/RecordScreen/RecordScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import { buildGameResultSlice } from '../jest/gameResultFixtures';

// jest에는 네이티브 모듈이 없어서 권한 통과 + 기록 있는 기기를 흉내낸다.
jest.mock('../src/shared/lib/samsungHealth', () => ({
  isSamsungHealthAvailable: () => true,
  hasSamsungHealthPermissions: async () => true,
  // 구간 첫 날에만 기록이 있는 상태.
  readSamsungHealthDailySummaries: async (startDate: string) => [
    { date: startDate, steps: 4231, distanceMeters: 3200, activeCalories: 176 },
  ],
  readSamsungHealthHourlySteps: async () => [
    { hour: 7, steps: 800 },
    { hour: 18, steps: 1500 },
  ],
}));

// 이동 여부를 확인해야 해서 같은 mock 함수를 밖으로 내보낸다.
jest.mock('@react-navigation/native', () => {
  const navigate = jest.fn();
  return { useNavigation: () => ({ navigate }), navigateMock: navigate };
});

const { navigateMock } = jest.requireMock('@react-navigation/native') as {
  navigateMock: jest.Mock;
};

/** 목록에 세울 산책 수. 최근 산책은 첫 페이지만 쓴다. */
const TOTAL_WALKS = 27;

/** 구간 라벨 기대값이 이 날을 기준으로 적혀 있다. 2026-07-28 (화). */
const TODAY = new Date(2026, 6, 28);

beforeAll(() => {
  // 화면은 오늘을 기준으로 구간을 잡아서, 시계를 두면 날이 바뀔 때마다
  // 기대값이 어긋난다.
  jest.useFakeTimers({
    now: TODAY,
    // Date만 고정한다. setTimeout까지 가짜로 바꾸면 react-query 알림을
    // 흘려보내는 flushQueries가 영원히 안 끝난다.
    doNotFake: [
      'cancelAnimationFrame',
      'cancelIdleCallback',
      'clearImmediate',
      'clearInterval',
      'clearTimeout',
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'requestIdleCallback',
      'setImmediate',
      'setInterval',
      'setTimeout',
    ],
  });
});

afterAll(() => {
  jest.useRealTimers();
});

let fetchMock: FetchMock;

beforeEach(() => {
  navigateMock.mockClear();
  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async url => {
    if (url.includes('/game-results')) {
      const size = Number(/size=(\d+)/.exec(url)?.[1]);
      return jsonResponse(200, buildGameResultSlice(0, size, TOTAL_WALKS));
    }
    throw new Error(`예상하지 못한 요청: ${url}`);
  });
});

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

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

async function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient = client;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <RecordScreen />
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

function findByAccessibilityLabel(root: ReactTestInstance, label: string) {
  return root.find(node => node.props.accessibilityLabel === label);
}

function gameResultRequestCount() {
  return fetchMock.mock.calls.filter(([url]) => url.includes('/game-results'))
    .length;
}

/** 테스트 렌더러는 실제 레이아웃을 내지 않으므로 onLayout을 직접 쏜다. */
async function measureChartArea(root: ReactTestInstance, width: number) {
  const chartArea = root.find(
    node => node.props.testID === 'step-chart-area',
  );

  await act(async () => {
    chartArea.props.onLayout({ nativeEvent: { layout: { width, height: 190 } } });
  });
}

/** 항목은 라벨만 노출하므로 텍스트에서 눌 수 있는 부모를 찾아 올라간다. */
async function pressTextLabel(root: ReactTestInstance, label: string) {
  const [textNode] = root
    .findAllByType(Text)
    .filter(node => node.props.children === label);

  if (!textNode) {
    throw new Error(`"${label}" 텍스트를 찾지 못했다.`);
  }

  let pressable: ReactTestInstance | null = textNode;
  while (pressable && typeof pressable.props.onPress !== 'function') {
    pressable = pressable.parent;
  }

  if (!pressable) {
    throw new Error(`"${label}"을 감싼 누를 수 있는 요소를 찾지 못했다.`);
  }

  const { onPress } = pressable.props;
  await act(async () => {
    onPress();
  });
  // 구간을 바꾸면 새 쿼리가 시작되므로 결과가 반영될 틈을 준다.
  await flushQueries();
}

describe('RecordScreen', () => {
  test('주간 요약과 최근 산책이 보인다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('기록');
    expect(texts).toContain('지금까지 진행한 기록을 확인해보세요');
    // 기본 구간은 주간이다.
    expect(texts).toContain('주간');
    expect(texts).toContain('이번 주 걸음');
    expect(texts).toContain('최근 산책');
    expect(texts).toContain('민서와의 산책');
    // 걸음·거리·칼로리는 산책방 단위로 남는 데가 없어 게임 지표를 보여준다.
    expect(texts).toContain('혼자 · 미션 4/9');
    // 카드는 한 줄만 써서 요일·시각 없이 날짜만 남긴다.
    expect(texts).toContain('2026.07.20');
    expect(texts).toContain('성공');
    expect(texts).toContain('전체 기록 보기');
  });

  test('오늘이 든 구간에서는 다음 구간으로 갈 수 없다', async () => {
    const tree = await renderScreen();

    // 처음엔 오늘이 든 구간을 보고 있으므로 앞으로 갈 수 없다.
    expect(
      findByAccessibilityLabel(tree.root, '다음 구간').props.accessibilityState,
    ).toEqual({ disabled: true });

    await act(async () => {
      findByAccessibilityLabel(tree.root, '이전 구간').props.onPress();
    });

    expect(
      findByAccessibilityLabel(tree.root, '다음 구간').props.accessibilityState,
    ).toEqual({ disabled: false });
  });

  test('구간을 바꾸면 제목이 그 구간에 맞게 바뀐다', async () => {
    const tree = await renderScreen();
    expect(collectTexts(tree.root)).toContain('이번 주 걸음');

    await act(async () => {
      findByAccessibilityLabel(tree.root, '기간 주간').props.onPress();
    });
    await pressTextLabel(tree.root, '일간');

    expect(collectTexts(tree.root)).toContain('오늘 걸음');
  });

  test('목표 걸음은 기록 화면에 두지 않는다', async () => {
    const tree = await renderScreen();

    // 목표는 산책 단위 값이라 산책 상세 화면이 보여준다.
    expect(
      collectTexts(tree.root).some(text => text.startsWith('목표 ')),
    ).toBe(false);
    expect(tree.root.findAllByType(ProgressChart)).toHaveLength(0);
  });

  test('카드 폭이 측정되면 걸음수 막대 차트를 그린다', async () => {
    const tree = await renderScreen();

    // 폭을 모르는 동안에는 차트를 그리지 않는다.
    expect(tree.root.findAllByType(BarChart)).toHaveLength(0);

    await measureChartArea(tree.root, 320);

    const [barChart] = tree.root.findAllByType(BarChart);
    expect(barChart).toBeTruthy();
    expect(barChart.props.width).toBe(320);
    // 기본 구간이 주간이므로 월~일 7개 막대가 선다.
    expect(barChart.props.data.labels).toEqual([
      '월',
      '화',
      '수',
      '목',
      '금',
      '토',
      '일',
    ]);
    expect(barChart.props.data.datasets[0].data).toHaveLength(7);
    // 막대 길이 비율이 왜곡되지 않도록 0에서 시작해야 한다.
    expect(barChart.props.fromZero).toBe(true);
  });

  test('최근 산책을 누르면 그 산책의 상세 화면으로 이동한다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findByAccessibilityLabel(
        tree.root,
        '민서와의 산책 상세 보기',
      ).props.onPress();
    });

    // 방 번호(4000번대)가 아니라 판 번호로 넘겨야 상세가 열린다.
    expect(navigateMock).toHaveBeenCalledWith('WalkDetail', { gameId: 1 });
  });

  test('최근 산책은 3건만 보여준다', async () => {
    const tree = await renderScreen();

    // 나머지는 전체 목록 화면에서 본다.
    expect(tree.root.findAllByType(WalkCard)).toHaveLength(
      RECENT_WALK_LIMIT,
    );
  });

  test('전체 기록 보기를 누르면 전체 목록 화면으로 이동한다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findByAccessibilityLabel(tree.root, '전체 기록 보기').props.onPress();
    });

    expect(navigateMock).toHaveBeenCalledWith('WalkList');
  });

  // 기록 탭은 한 번 열리면 계속 살아 있어 다시 마운트되지 않는다. 당겨서
  // 새로고침이 없으면 앱을 다시 열기 전까지 최근 산책이 그대로 멈춰 있었다.
  test('당겨서 새로고침하면 최근 산책을 다시 부른다', async () => {
    const tree = await renderScreen();
    const before = gameResultRequestCount();

    await act(async () => {
      tree.root
        .findAll(node => node.props.refreshControl != null)[0]
        .props.refreshControl.props.onRefresh();
    });
    await flushQueries();

    expect(gameResultRequestCount()).toBeGreaterThan(before);
  });
});

describe('RecordScreen 구간 선택', () => {
  /** 구간 선택 시트를 연다. */
  async function openPicker(root: ReactTestInstance) {
    const label = root.find(
      node =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('구간 선택,'),
    );

    await act(async () => {
      label.props.onPress();
    });
  }

  async function pressLabel(root: ReactTestInstance, label: string) {
    await act(async () => {
      findByAccessibilityLabel(root, label).props.onPress();
    });
    await flushQueries();
  }

  test('주간에서는 그 달과 겹치는 주 구간을 고를 수 있다', async () => {
    const tree = await renderScreen();
    await openPicker(tree.root);

    expect(collectTexts(tree.root)).toContain('주 선택');

    // 달 경계를 넘는 주까지 나온다. 2026-07은 6.29에 시작하는 주부터다.
    await pressLabel(tree.root, '이전 달');
    await pressLabel(tree.root, '6.29 (월) - 7.5 (일)');

    expect(collectTexts(tree.root)).toContain('6.29 (월) - 7.5 (일)');
  });

  test('일간에서는 날짜 달력으로 하루를 고른다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findByAccessibilityLabel(tree.root, '기간 주간').props.onPress();
    });
    await pressTextLabel(tree.root, '일간');
    await openPicker(tree.root);

    expect(collectTexts(tree.root)).toContain('날짜 선택');
    // 요일 머리글이 있어야 날짜가 어느 요일인지 읽힌다.
    expect(collectTexts(tree.root)).toContain('수');

    // 지난 달로 넘겨 아무 날짜나 고른다(이번 달 뒷날은 미래라 막혀 있다).
    await pressLabel(tree.root, '이전 달');
    await pressLabel(tree.root, '15일');

    const texts = collectTexts(tree.root);
    // 고른 날짜가 구간 라벨에 반영된다.
    expect(texts).toContain('6.15 (월)');
    // 지난 날이므로 '오늘 걸음'이 아니다.
    expect(texts).toContain('하루 걸음');
  });

  test('월간에서는 연도 아래 12개월을 고른다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findByAccessibilityLabel(tree.root, '기간 주간').props.onPress();
    });
    await pressTextLabel(tree.root, '월간');
    await openPicker(tree.root);

    const texts = collectTexts(tree.root);
    expect(texts).toContain('월 선택');
    expect(texts).toContain('1월');
    expect(texts).toContain('12월');

    await pressLabel(tree.root, '이전 해');
    await pressLabel(tree.root, '2025년 3월');

    expect(collectTexts(tree.root)).toContain('2025.03');
  });

  test('아직 오지 않은 해로는 넘길 수 없다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findByAccessibilityLabel(tree.root, '기간 주간').props.onPress();
    });
    await pressTextLabel(tree.root, '월간');
    await openPicker(tree.root);

    expect(
      findByAccessibilityLabel(tree.root, '다음 해').props.accessibilityState,
    ).toEqual({ disabled: true });
  });
});
