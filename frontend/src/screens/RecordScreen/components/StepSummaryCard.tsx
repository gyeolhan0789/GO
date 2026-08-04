import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  HistoryPeriod,
  HistoryResponse,
} from '../../../features/history/api/historyApi';
import { formatThousands } from '../../../features/history/model/format';
import {
  maxValue,
  resolveChartCeiling,
} from '../../../features/history/model/chartScale';
import type { ChartSegment } from '../../../features/history/model/chartSegments';
import { buildChartSegments } from '../../../features/history/model/chartSegments';
import {
  buildHourlyChartData,
  buildStepChartData,
  stepSummaryTitle,
} from '../../../features/history/model/histories';
import type { HourlyStep } from '../../../features/history/types';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';
import { ChartSegmentOverlay } from './ChartSegmentOverlay';
import { HourlyStepChart } from './HourlyStepChart';
import type { SegmentAnchor } from './resolvePopoverPosition';
import { StepBarChart } from './StepBarChart';

type StepSummaryCardProps = {
  history: HistoryResponse;
  /** 일간에서만 채워진다. */
  hourlySteps: HourlyStep[];
  /** 제목 문구와 오늘 막대 강조에 쓴다. */
  isCurrentPeriod: boolean;
  todayIsoDate: string;
  /** 기록 카드가 떠 있는 구간. 그 막대에 표시를 남겨 둔다. */
  selectedSegmentIndex: number | null;
  /** 차트에서 누른 구간. 그 구간의 기록을 화면이 카드로 띄운다. */
  onSelectSegment: (segment: ChartSegment, anchor: SegmentAnchor | null) => void;
};

const CHART_HEIGHT = 200;
const CHART_SEGMENTS = 4;

export function StepSummaryCard({
  history,
  hourlySteps,
  isCurrentPeriod,
  todayIsoDate,
  selectedSegmentIndex,
  onSelectSegment,
}: StepSummaryCardProps) {
  // chart-kit은 너비를 픽셀 숫자로만 받아서 실제 레이아웃을 재야 한다.
  const [chartWidth, setChartWidth] = useState(0);

  const period: HistoryPeriod = history.period;

  // 일간은 날짜별 합계가 막대 하나뿐이라 시간대별 추이로 대신 그린다.
  const isHourly = period === 'DAY';
  const chartData = isHourly
    ? buildHourlyChartData(hourlySteps)
    : buildStepChartData(period, history.histories, todayIsoDate);
  const hasChart = chartData.length > 0 && history.totalStep > 0;
  const chartCeiling = resolveChartCeiling(
    period,
    maxValue(chartData.map(datum => datum.value)),
  );
  // 차트에 그려진 자리와 1:1로 맞물린다. 탭 영역이 이 순서를 그대로 쓴다.
  const segments = buildChartSegments(period, history.histories, hourlySteps);

  return (
    <Card>
      <AppText style={styles.title}>
        {stepSummaryTitle(period, isCurrentPeriod)}
      </AppText>
      <View style={styles.totalRow}>
        <AppText style={styles.totalValue}>
          {formatThousands(history.totalStep)}
        </AppText>
        <AppText style={styles.totalUnit}>걸음</AppText>
      </View>

      {hasChart ? (
        <>
          <View
            testID="step-chart-area"
            style={styles.chart}
            onLayout={event => setChartWidth(event.nativeEvent.layout.width)}
          >
            {chartWidth > 0 ? (
              <>
                {isHourly ? (
                  <HourlyStepChart
                    data={chartData}
                    width={chartWidth}
                    height={CHART_HEIGHT}
                    segments={CHART_SEGMENTS}
                    ceiling={chartCeiling}
                  />
                ) : (
                  <StepBarChart
                    data={chartData}
                    width={chartWidth}
                    height={CHART_HEIGHT}
                    segments={CHART_SEGMENTS}
                    ceiling={chartCeiling}
                    // 주별로 묶은 월간은 막대만으로 크기를 가늠하기 어렵다.
                    withInnerLines={period === 'MONTH'}
                  />
                )}
                {segments.length > 0 ? (
                  <ChartSegmentOverlay
                    segments={segments}
                    alignHighlightToBar={!isHourly}
                    selectedIndex={selectedSegmentIndex}
                    onSelect={onSelectSegment}
                  />
                ) : null}
              </>
            ) : null}
          </View>
          {/* 눌 수 있다는 걸 알려주지 않으면 아무도 누르지 않는다. */}
          <AppText style={styles.hint}>
            구간을 누르면 그때의 기록을 볼 수 있어요
          </AppText>
        </>
      ) : (
        <AppText style={styles.emptyText}>이 기간에는 걸음 기록이 없어요.</AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: bodyFont.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    opacity: 0.7,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  totalValue: {
    fontFamily: bodyFont.bold,
    fontSize: 28,
    lineHeight: lineHeights[28],
    color: colors.primary,
  },
  totalUnit: {
    fontFamily: bodyFont.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
  },
  chart: {
    marginTop: spacing.md,
  },
  hint: {
    fontFamily: bodyFont.regular,
    fontSize: 11,
    lineHeight: lineHeights[11],
    color: colors.ink,
    opacity: 0.45,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyText: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
