/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { ChartSegment } from '../src/features/history/model/chartSegments';
import { SegmentDetailPopover } from '../src/screens/RecordScreen/components/SegmentDetailPopover';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const DAY_SEGMENT: ChartSegment = {
  index: 0,
  label: '7.20 (월)',
  dateRange: { startDate: '2026-07-20', endDate: '2026-07-20' },
  step: 8_431,
  distance: 6_200,
  calories: 320,
};

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

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

type PopoverOptions = {
  segment?: ChartSegment | null;
  onClose?: () => void;
};

async function renderPopover({
  segment = DAY_SEGMENT,
  onClose = () => {},
}: PopoverOptions = {}) {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <SegmentDetailPopover
          segment={segment}
          // 테스트 렌더러는 실제 배치를 내지 않아 막대 자리를 잴 수 없다.
          anchor={null}
          onClose={onClose}
        />
      </SafeAreaProvider>,
    );
  });

  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

function findByAccessibilityLabel(root: ReactTestInstance, label: string) {
  return root.find(node => node.props.accessibilityLabel === label);
}

describe('SegmentDetailPopover 활동 수치', () => {
  test('구간의 걸음·거리·칼로리를 보여준다', async () => {
    const tree = await renderPopover();
    const texts = collectTexts(tree.root);

    // 누른 구간이 어디인지 제목으로 알 수 있어야 한다.
    expect(texts).toContain('7.20 (월)');
    expect(texts).toContain('8,431');
    expect(texts).toContain('걸음');
    expect(texts).toContain('6.2');
    expect(texts).toContain('km');
    expect(texts).toContain('320');
    expect(texts).toContain('kcal');
  });

  test('1km 미만은 미터로 둔다', async () => {
    const tree = await renderPopover({
      segment: { ...DAY_SEGMENT, distance: 840 },
    });
    const texts = collectTexts(tree.root);

    // '0.8km'로 보여주면 정보가 깎인다.
    expect(texts).toContain('840');
    expect(texts).toContain('m');
  });

  test('시간대 구간은 걸음만 보여준다', async () => {
    const tree = await renderPopover({
      segment: {
        ...DAY_SEGMENT,
        label: '18시 - 21시',
        step: 4_231,
        // 시간대별로는 거리·칼로리를 읽을 수 없다.
        distance: null,
        calories: null,
      },
    });
    const texts = collectTexts(tree.root);

    expect(texts).toContain('18시 - 21시');
    expect(texts).toContain('4,231');
    expect(texts).not.toContain('거리');
    expect(texts).not.toContain('칼로리');
  });

  test('걸음이 없는 구간도 0으로 보여준다', async () => {
    // 빈 카드를 띄우는 대신 '그 구간에는 활동이 없었다'를 수치로 읽게 한다.
    const tree = await renderPopover({
      segment: { ...DAY_SEGMENT, step: 0, distance: 0, calories: 0 },
    });

    expect(collectTexts(tree.root)).toContain('0');
  });

  test('고른 구간이 없으면 아무것도 띄우지 않는다', async () => {
    const tree = await renderPopover({ segment: null });

    expect(collectTexts(tree.root)).toEqual([]);
  });
});

describe('SegmentDetailPopover 닫기', () => {
  test('카드 밖을 누르면 닫힌다', async () => {
    const onClose = jest.fn();
    const tree = await renderPopover({ onClose });

    await act(async () => {
      findByAccessibilityLabel(tree.root, '구간 기록 닫기').props.onPress();
    });

    expect(onClose).toHaveBeenCalled();
  });

  test('산책 기록은 이 카드가 맡지 않는다', async () => {
    // 기록 화면이 보여줄 것은 신체 활동이다. 산책 단위 기록은 '최근 산책'과
    // 전체 목록 화면이 이미 맡고 있다.
    const tree = await renderPopover();
    const texts = collectTexts(tree.root);

    expect(texts).not.toContain('산책 1개');
    expect(texts.some(text => text.includes('산책'))).toBe(false);
  });
});
