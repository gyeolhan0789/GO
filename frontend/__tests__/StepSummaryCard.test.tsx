/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Text, View } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { BarChart, LineChart, ProgressChart } from 'react-native-chart-kit';

import type {
  HistoryPeriod,
  HistoryResponse,
} from '../src/features/history/api/historyApi';
import type { HourlyStep } from '../src/features/history/types';
import { colors } from '../src/shared/constants/colors';
import { BAR_CHART_CONFIG } from '../src/screens/RecordScreen/chartConfig';
import { StepSummaryCard } from '../src/screens/RecordScreen/components/StepSummaryCard';

// 실행 날짜에 따라 결과가 바뀌지 않게 고정 데이터로 그린다.
const TODAY = '2026-07-28';

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

function buildHistory(
  period: HistoryPeriod,
  days: { historyDate: string; step: number }[],
): HistoryResponse {
  const histories = days.map(day => ({
    ...day,
    distance: day.step,
    calories: day.step,
  }));

  return {
    period,
    startDate: days[0].historyDate,
    endDate: days[days.length - 1].historyDate,
    totalStep: histories.reduce((total, day) => total + day.step, 0),
    totalDistance: 0,
    totalCalories: 0,
    histories,
  };
}

/** 새벽은 0, 06시부터 걸음이 있는 하루. */
function buildHourlySteps(): HourlyStep[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    step: hour < 6 ? 0 : hour * 10,
  }));
}

async function renderCard(
  history: HistoryResponse,
  hourlySteps: HourlyStep[] = [],
  selectedSegmentIndex: number | null = null,
) {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <StepSummaryCard
        history={history}
        hourlySteps={hourlySteps}
        isCurrentPeriod
        todayIsoDate={TODAY}
        selectedSegmentIndex={selectedSegmentIndex}
        onSelectSegment={() => {}}
      />,
    );
  });

  if (!renderer) {
    throw new Error('renderer not initialized');
  }

  // 테스트 렌더러는 실제 레이아웃을 내지 않으므로 onLayout을 직접 쏜다.
  const chartArea = renderer.root.find(
    node => node.props.testID === 'step-chart-area',
  );
  await act(async () => {
    chartArea.props.onLayout({
      nativeEvent: { layout: { width: 320, height: 200 } },
    });
  });

  return renderer;
}

const WEEK_DAYS = [
  { historyDate: '2026-07-27', step: 8_000 },
  { historyDate: '2026-07-28', step: 12_000 },
  { historyDate: '2026-07-29', step: 0 },
];

/**
 * 눌린 구간을 덮는 면이 칸에서 차지하는 비율. 칸 하나가 구간 하나이므로 이 값이
 * 곧 표시가 구간 경계와 맞는지를 말한다(ChartSegmentOverlay 참고).
 */
function highlightFlexes(root: ReactTestInstance): number[] {
  return root
    .findAllByType(View)
    .map(node => StyleSheet.flatten(node.props.style))
    .filter(style => style?.backgroundColor === colors.successBg)
    .map(style => style.flex);
}

describe('StepSummaryCard - 일간', () => {
  const dayHistory = buildHistory('DAY', [
    { historyDate: TODAY, step: 4_231 },
  ]);

  test('시간대별 추이를 LineChart로 그린다', async () => {
    const tree = await renderCard(dayHistory, buildHourlySteps());

    // 하루치 합계는 막대 하나뿐이라 막대 차트를 쓰지 않는다.
    expect(tree.root.findAllByType(BarChart)).toHaveLength(0);

    const [lineChart] = tree.root.findAllByType(LineChart);
    expect(lineChart).toBeTruthy();
    // 00시부터 23시까지 24개 지점. 하루 합계와 곡선이 같은 구간을 봐야 한다.
    expect(lineChart.props.data.datasets[0].data).toHaveLength(24);
    // 라벨은 3시간마다만 달아 x축이 붐비지 않게 한다.
    expect(lineChart.props.data.labels.filter(Boolean)).toEqual([
      '00',
      '03',
      '06',
      '09',
      '12',
      '15',
      '18',
      '21',
    ]);
    expect(lineChart.props.fromZero).toBe(true);
  });

  test('점 없이 부드러운 곡선으로 그린다', async () => {
    const tree = await renderCard(dayHistory, buildHourlySteps());
    const [lineChart] = tree.root.findAllByType(LineChart);

    // 24개 시간대를 점으로 다 찍으면 점이 선을 덮어 추이가 안 읽힌다.
    expect(lineChart.props.withDots).toBe(false);
    // 시간마다 꺾이면 톱날처럼 보인다.
    expect(lineChart.props.bezier).toBe(true);
  });

  test('구간 합계를 제목과 함께 보여준다', async () => {
    const tree = await renderCard(dayHistory, buildHourlySteps());
    const texts = collectTexts(tree.root);

    expect(texts).toContain('오늘 걸음');
    expect(texts).toContain('4,231');
    expect(texts).toContain('걸음');
  });

  test('폭은 재어온 값을 그대로 넘겨 오른쪽까지 채운다', async () => {
    const tree = await renderCard(dayHistory, buildHourlySteps());
    const [lineChart] = tree.root.findAllByType(LineChart);

    // LineChart는 width를 Svg 폭과 점 x좌표에 모두 쓴다. 여백을 맞추려고 여기서
    // 빼면 점들이 그만큼 왼쪽으로 몰려 오른쪽이 텅 빈다.
    expect(lineChart.props.width).toBe(320);
    // marginRight를 주면 Svg 폭이 어긋난다. paddingRight만 넘긴다.
    expect(lineChart.props.style).not.toHaveProperty('marginRight');
    expect(lineChart.props.style).toEqual({
      paddingRight: 40,
    });
    expect(lineChart.props.yLabelsOffset).toBe(8);
  });

  test('고른 시간대 표시가 3시간 칸을 꽉 덮는다', async () => {
    // 12시 - 15시 묶음.
    const tree = await renderCard(dayHistory, buildHourlySteps(), 4);

    // 막대가 없는 곡선은 칸 전체가 그 구간이다. 여기에 막대 비율(2/3)을 주면
    // flex 합이 1보다 작아 표시가 칸의 2/3만 덮어 12-14시처럼 보인다.
    expect(highlightFlexes(tree.root)).toEqual([1]);
  });

  test('목표는 여기서 다루지 않는다', async () => {
    const tree = await renderCard(dayHistory, buildHourlySteps());

    // 목표 걸음은 산책 단위 값이라 산책 상세 화면이 보여준다.
    expect(
      collectTexts(tree.root).some(text => text.startsWith('목표 ')),
    ).toBe(false);
    expect(tree.root.findAllByType(ProgressChart)).toHaveLength(0);
  });
});

describe('y축 눈금 표기', () => {
  const formatYLabel = BAR_CHART_CONFIG.formatYLabel;

  test('1000 미만은 그대로 둔다', () => {
    expect(formatYLabel('0')).toBe('0');
    expect(formatYLabel('500')).toBe('500');
  });

  test('딱 나누어떨어지면 K로 줄인다', () => {
    expect(formatYLabel('1000')).toBe('1K');
    expect(formatYLabel('20000')).toBe('20K');
    expect(formatYLabel('80000')).toBe('80K');
  });

  test('나누어떨어지지 않으면 소수 한 자리를 남긴다', () => {
    // 반올림해서 '2K'로 만들면 눈금이 실제 값과 어긋난다.
    expect(formatYLabel('1500')).toBe('1.5K');
    expect(formatYLabel('2500')).toBe('2.5K');
  });

  test('월간 규모도 같은 표기를 쓴다', () => {
    expect(formatYLabel('40000')).toBe('40K');
  });
});

describe('StepSummaryCard - 주간/월간', () => {
  test('주간은 하루씩 막대를 세운다', async () => {
    const tree = await renderCard(buildHistory('WEEK', WEEK_DAYS));

    const [barChart] = tree.root.findAllByType(BarChart);
    expect(barChart).toBeTruthy();
    // 하루 최대 12,000이라 5.6k/8.0k 단계를 넘어 2,000 단위로 올라간 값.
    expect(barChart.props.fromNumber).toBe(14_000);
    // 막대가 적어 눈금선 없이도 읽힌다.
    expect(barChart.props.withInnerLines).toBe(false);
  });

  test('BarChart도 폭을 그대로 받고 y축 여백만 좁힌다', async () => {
    const tree = await renderCard(buildHistory('WEEK', WEEK_DAYS));
    const [barChart] = tree.root.findAllByType(BarChart);

    expect(barChart.props.width).toBe(320);
    // 기본 64dp는 '1.5K'짜리 라벨에 과해서 차트 왼쪽이 비어 보인다.
    expect(barChart.props.style).toEqual({
      paddingRight: 40,
    });
    expect(barChart.props.yLabelsOffset).toBe(8);
  });

  test('월간은 주별로 묶어 막대를 세운다', async () => {
    const monthHistory = buildHistory('MONTH', [
      { historyDate: '2026-07-01', step: 32_100 },
      { historyDate: '2026-07-08', step: 48_600 },
      { historyDate: '2026-07-15', step: 36_800 },
      { historyDate: '2026-07-22', step: 34_900 },
      { historyDate: '2026-07-29', step: 0 },
    ]);

    const tree = await renderCard(monthHistory);
    const [barChart] = tree.root.findAllByType(BarChart);

    // 막대 위에 숫자를 얹으면 눈금과 겹쳐 읽기 어렵다.
    expect(barChart.props.showValuesOnTopOfBars).toBeFalsy();
    expect(barChart.props.chartConfig.formatTopBarValue).toBeUndefined();
    // 대신 가로 눈금선으로 크기를 가늠한다.
    expect(barChart.props.withInnerLines).toBe(true);
    expect(barChart.props.data.labels).toEqual([
      '1주',
      '2주',
      '3주',
      '4주',
      '5주',
    ]);
    expect(barChart.props.data.datasets[0].data).toEqual([
      32_100, 48_600, 36_800, 34_900, 0,
    ]);
    // 최댓값 48,600에 여유를 두고 80K 상한 -> 눈금이 0/20K/40K/60K/80K로 떨어진다.
    expect(barChart.props.fromNumber).toBe(80_000);
  });

  test('고른 막대 표시는 막대 자리에만 앉는다', async () => {
    const tree = await renderCard(buildHistory('WEEK', WEEK_DAYS), [], 1);

    // 막대는 칸 오른쪽 2/3에 붙어 그려진다(resolveBarPercentage 참고). 앞의
    // 1/3은 빈 칸이 차지해 둘이 칸을 정확히 나눠 가진다.
    expect(highlightFlexes(tree.root)).toEqual([2 / 3]);
  });

  test('기록이 없는 기간에는 차트 대신 안내를 보여준다', async () => {
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <StepSummaryCard
          history={buildHistory('WEEK', [
            { historyDate: '2026-07-27', step: 0 },
          ])}
          hourlySteps={[]}
          isCurrentPeriod
          todayIsoDate={TODAY}
          selectedSegmentIndex={null}
          onSelectSegment={() => {}}
        />,
      );
    });

    const tree = renderer!;
    expect(tree.root.findAllByType(BarChart)).toHaveLength(0);
    expect(collectTexts(tree.root)).toContain('이 기간에는 걸음 기록이 없어요.');
  });
});
