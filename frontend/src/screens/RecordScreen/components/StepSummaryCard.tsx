import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { ChartSegmentOverlay } from './ChartSegmentOverlay';
import { HourlyStepChart } from './HourlyStepChart';
import { StepBarChart } from './StepBarChart';

type StepSummaryCardProps = {
  history: HistoryResponse;
  /** 일간에서만 채워진다. */
  hourlySteps: HourlyStep[];
  /** 제목 문구와 오늘 막대 강조에 쓴다. */
  isCurrentPeriod: boolean;
  todayIsoDate: string;
  /** 차트에서 누른 구간. 그 구간의 기록을 화면이 시트로 띄운다. */
  onSelectSegment: (segment: ChartSegment) => void;
};

const CHART_HEIGHT = 200;
const CHART_SEGMENTS = 4;

export function StepSummaryCard({
  history,
  hourlySteps,
  isCurrentPeriod,
  todayIsoDate,
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
      <Text style={styles.title}>
        {stepSummaryTitle(period, isCurrentPeriod)}
      </Text>
      <View style={styles.totalRow}>
        <Text style={styles.totalValue}>
          {formatThousands(history.totalStep)}
        </Text>
        <Text style={styles.totalUnit}>걸음</Text>
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
                    onSelect={onSelectSegment}
                  />
                ) : null}
              </>
            ) : null}
          </View>
          {/* 눌 수 있다는 걸 알려주지 않으면 아무도 누르지 않는다. */}
          <Text style={styles.hint}>
            구간을 누르면 그때의 기록을 볼 수 있어요
          </Text>
        </>
      ) : (
        <Text style={styles.emptyText}>이 기간에는 걸음 기록이 없어요.</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: 'BMDOHYEON',
    fontSize: 14,
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
    fontFamily: 'BMDOHYEON',
    fontSize: 28,
    color: colors.primary,
  },
  totalUnit: {
    fontFamily: 'BMDOHYEON',
    fontSize: 14,
    color: colors.ink,
  },
  chart: {
    marginTop: spacing.md,
  },
  hint: {
    fontFamily: 'BMDOHYEON',
    fontSize: 11,
    color: colors.ink,
    opacity: 0.45,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 12,
    color: colors.ink,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
