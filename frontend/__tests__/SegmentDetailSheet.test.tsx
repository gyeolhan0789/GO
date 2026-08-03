/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { ChartSegment } from '../src/features/history/model/chartSegments';
import { SegmentDetailSheet } from '../src/screens/RecordScreen/components/SegmentDetailSheet';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

// 목업 산책은 2026-07-20에 20:00으로 시작한다(features/history/mocks.ts).
const WALK_DATE = '2026-07-20';

const DAY_SEGMENT: ChartSegment = {
  index: 0,
  label: '7.20 (월)',
  dateRange: { startDate: WALK_DATE, endDate: WALK_DATE },
  hourRange: null,
  step: 8_431,
  distance: 6_200,
  calories: 320,
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
  onSelectWalk: (walkId: number) => void = () => {},
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
    expect(texts).toContain('민서와의 산책');
  });

  test('산책을 누르면 그 산책을 알려준다', async () => {
    const onSelectWalk = jest.fn();
    const tree = await renderSheet(DAY_SEGMENT, onSelectWalk);

    await act(async () => {
      tree.root
        .find(
          node => node.props.accessibilityLabel === '민서와의 산책 상세 보기',
        )
        .props.onPress();
    });

    expect(onSelectWalk).toHaveBeenCalledWith(1);
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
    expect(texts).toContain('민서와의 산책');
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
    const texts = collectTexts(tree.root);

    expect(texts).toContain('이 구간에는 산책 기록이 없어요.');
    expect(texts).not.toContain('민서와의 산책');
  });

  test('고른 구간이 없으면 시트를 띄우지 않는다', async () => {
    const tree = await renderSheet(null);

    expect(collectTexts(tree.root)).toEqual([]);
  });
});
