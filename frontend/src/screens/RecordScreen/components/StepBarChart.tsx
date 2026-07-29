import { BarChart } from 'react-native-chart-kit';

import type { StepChartDatum } from '../../../features/history/model/histories';
import {
  barColor,
  highlightedBarColor,
  MONTH_BAR_CHART_CONFIG,
  resolveBarPercentage,
  WEEK_BAR_CHART_CONFIG,
  Y_AXIS_GUTTER,
  Y_AXIS_GUTTER_STYLE,
  Y_LABEL_OFFSET,
} from '../chartConfig';

type StepBarChartProps = {
  data: StepChartDatum[];
  width: number;
  height: number;
  segments: number;
  /** y축 최소 상한. */
  ceiling: number;
  /** 막대 위에 값을 적는다. */
  showValues: boolean;
};

/** 주간(요일별)·월간(주별) 걸음 막대. */
export function StepBarChart({
  data,
  width,
  height,
  segments,
  ceiling,
  showValues,
}: StepBarChartProps) {
  const chartConfig = {
    ...(showValues ? MONTH_BAR_CHART_CONFIG : WEEK_BAR_CHART_CONFIG),
    barPercentage: resolveBarPercentage(width - Y_AXIS_GUTTER, data.length),
  };

  return (
    <BarChart
      data={{
        labels: data.map(datum => datum.label),
        datasets: [
          {
            data: data.map(datum => datum.value),
            // withCustomBarColorFromData + flatColor 조합이라야 이 색이
            // 그라데이션 없이 그대로 쓰인다.
            colors: data.map(datum =>
              datum.highlighted ? highlightedBarColor : barColor,
            ),
          },
        ],
      }}
      width={width}
      height={height}
      chartConfig={chartConfig}
      segments={segments}
      // 0에서 시작하지 않으면 막대 길이 비율이 실제 걸음 차이를 왜곡한다.
      fromZero
      fromNumber={ceiling}
      withInnerLines={showValues}
      showBarTops={false}
      showValuesOnTopOfBars={showValues}
      withCustomBarColorFromData
      flatColor
      yAxisLabel=""
      yAxisSuffix=""
      yLabelsOffset={Y_LABEL_OFFSET}
      style={Y_AXIS_GUTTER_STYLE}
    />
  );
}
