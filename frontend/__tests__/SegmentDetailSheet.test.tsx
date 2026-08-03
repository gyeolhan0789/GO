/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { GameResultResponse } from '../src/features/history/api/gameResultApi';
import { SEGMENT_SCAN_PAGE_SIZE } from '../src/features/history/hooks/useSegmentWalksQuery';
import type { ChartSegment } from '../src/features/history/model/chartSegments';
import { SegmentDetailSheet } from '../src/screens/RecordScreen/components/SegmentDetailSheet';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import { buildGameResultResponse } from '../jest/gameResultFixtures';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** 하루에 한 건씩, 이 날부터 과거로 내려가는 목록을 만든다. */
const NEWEST_WALK_DATE = new Date(2026, 6, 31);

const DAY_SEGMENT: ChartSegment = {
  index: 0,
  label: '7.20 (월)',
  dateRange: { startDate: '2026-07-20', endDate: '2026-07-20' },
  hourRange: null,
  step: 8_431,
  distance: 6_200,
  calories: 320,
};

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;

/** index 0이 가장 최근. 서버처럼 최신순으로 내려준다. */
function buildDailyWalk(index: number): GameResultResponse {
  const started = new Date(NEWEST_WALK_DATE);
  started.setDate(started.getDate() - index);
  const date = `${started.getFullYear()}-${`${started.getMonth() + 1}`.padStart(
    2,
    '0',
  )}-${`${started.getDate()}`.padStart(2, '0')}`;

  return {
    ...buildGameResultResponse(index),
    startedAt: `${date}T20:00:00`,
    completedAt: `${date}T20:12:31`,
  };
}

/** 총 total건을 페이지로 잘라 주는 fetch mock을 세운다. */
function mockWalkPages(total: number) {
  fetchMock.mockImplementation(async url => {
    if (!url.includes('/game-results')) {
      throw new Error(`예상하지 못한 요청: ${url}`);
    }

    const page = Number(/page=(\d+)/.exec(url)?.[1]);
    const size = Number(/size=(\d+)/.exec(url)?.[1]);
    const start = page * size;
    const content = Array.from(
      { length: Math.max(0, Math.min(size, total - start)) },
      (_, offset) => buildDailyWalk(start + offset),
    );

    return jsonResponse(200, {
      content,
      hasNext: start + content.length < total,
    });
  });
}

function walkPageRequests() {
  return fetchMock.mock.calls.filter(([url]) => url.includes('/game-results'));
}

beforeEach(() => {
  fetchMock = installFetchMock();
  mockWalkPages(SEGMENT_SCAN_PAGE_SIZE);
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

function collectTexts(root: ReactTestInstance): string[] {
  return root
    .findAllByType(Text)
    .flatMap(node => {
      const children = node.props.children;
      return Array.isArray(children) ? children : [children];
    })
    .filter((child): child is string => typeof child === 'string');
}

async function renderSheet(
  segment: ChartSegment | null,
  onSelectWalk: (gameId: number) => void = () => {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient = client;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <SegmentDetailSheet
            segment={segment}
            onClose={() => {}}
            onSelectWalk={onSelectWalk}
          />
        </SafeAreaProvider>
      </QueryClientProvider>,
    );
  });

  // react-query는 알림을 setTimeout으로 모아 보내서 타이머까지 흘려보내야 한다.
  await act(async () => {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 0);
    });
  });

  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

describe('SegmentDetailSheet', () => {
  test('구간 합계와 그 구간의 산책을 보여준다', async () => {
    const tree = await renderSheet(DAY_SEGMENT);
    const texts = collectTexts(tree.root);

    // 누른 구간이 어디인지 제목으로 알 수 있어야 한다.
    expect(texts).toContain('7.20 (월)');
    expect(texts).toContain('8,431');
    expect(texts).toContain('걸음');
    expect(texts).toContain('6.2');
    expect(texts).toContain('km');
    expect(texts).toContain('320');
    expect(texts).toContain('kcal');

    expect(texts).toContain('이 구간의 산책');
    // 7.20에 시작한 산책은 목록의 12번째(7.31 - 11일).
    expect(texts).toContain('2026.07.20');
  });

  test('산책을 누르면 그 산책을 알려준다', async () => {
    const onSelectWalk = jest.fn();
    const tree = await renderSheet(DAY_SEGMENT, onSelectWalk);

    const [walkCard] = tree.root.findAll(
      node =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.endsWith(' 상세 보기'),
      { deep: false },
    );

    await act(async () => {
      walkCard.props.onPress();
    });

    // gameId는 index + 1. 7.20은 index 11이다.
    expect(onSelectWalk).toHaveBeenCalledWith(12);
  });

  test('시간대 구간은 걸음만 보여준다', async () => {
    const tree = await renderSheet({
      ...DAY_SEGMENT,
      label: '18시 - 21시',
      hourRange: { startHour: 18, endHour: 21 },
      step: 4_231,
      // 시간대별로는 거리·칼로리를 읽을 수 없다.
      distance: null,
      calories: null,
    });
    const texts = collectTexts(tree.root);

    expect(texts).toContain('18시 - 21시');
    expect(texts).toContain('4,231');
    expect(texts).not.toContain('거리');
    expect(texts).not.toContain('칼로리');
    // 20:00에 시작한 산책이라 이 시간대에 든다.
    expect(texts).toContain('2026.07.20');
  });

  test('시각이 구간을 벗어난 산책은 세우지 않는다', async () => {
    const tree = await renderSheet({
      ...DAY_SEGMENT,
      label: '06시 - 09시',
      hourRange: { startHour: 6, endHour: 9 },
      distance: null,
      calories: null,
    });

    // 목업 산책은 모두 20:00 시작이다.
    expect(collectTexts(tree.root)).toContain(
      '이 구간에는 산책 기록이 없어요.',
    );
  });

  test('산책이 없는 구간에는 안내를 보여준다', async () => {
    const tree = await renderSheet({
      ...DAY_SEGMENT,
      label: '1.1 (목)',
      dateRange: { startDate: '2026-01-01', endDate: '2026-01-01' },
      step: 0,
      distance: 0,
      calories: 0,
    });

    expect(collectTexts(tree.root)).toContain(
      '이 구간에는 산책 기록이 없어요.',
    );
  });

  test('구간을 지나칠 때까지만 페이지를 받아온다', async () => {
    // 첫 장(7.31~6.12)이 모두 구간보다 뒤라 다음 장까지 봐야 한다.
    mockWalkPages(SEGMENT_SCAN_PAGE_SIZE * 3);

    const tree = await renderSheet({
      ...DAY_SEGMENT,
      label: '6.1 (월)',
      dateRange: { startDate: '2026-06-01', endDate: '2026-06-01' },
    });

    expect(collectTexts(tree.root)).toContain('2026.06.01');
    // 둘째 장에 구간보다 이른 산책이 나오므로 셋째 장은 받지 않는다.
    expect(walkPageRequests()).toHaveLength(2);
  });

  test('고른 구간이 없으면 시트를 띄우지 않는다', async () => {
    const tree = await renderSheet(null);

    expect(collectTexts(tree.root)).toEqual([]);
    // 열지도 않은 시트 때문에 요청이 나가면 안 된다.
    expect(walkPageRequests()).toHaveLength(0);
  });
});
