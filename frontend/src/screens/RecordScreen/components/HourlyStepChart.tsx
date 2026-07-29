import { LineChart } from 'react-native-chart-kit';

import type { StepChartDatum } from '../../../features/history/model/histories';
import {
  HOUR_LINE_CHART_CONFIG,
  Y_AXIS_GUTTER_STYLE,
  Y_LABEL_OFFSET,
} from '../chartConfig';

type HourlyStepChartProps = {
  data: StepChartDatum[];
  width: number;
  height: number;
  segments: number;
  /** y축 최소 상한. */
  ceiling: number;
};

/** 시간대별 걸음 추이. 곡선과 그 아래 영역으로 그린다. */
export function HourlyStepChart({
  data,
  width,
  height,
  segments,
  ceiling,
}: HourlyStepChartProps) {
  return (
    <LineChart
      data={{
        labels: data.map(datum => datum.label),
        datasets: [{ data: data.map(datum => datum.value) }],
      }}
      // LineChart는 width를 Svg 폭과 점 x좌표에 모두 쓴다. 여기서 줄이면 점들이
      // 그만큼 왼쪽으로 몰려 오른쪽이 빈다.
      width={width}
      height={height}
      chartConfig={HOUR_LINE_CHART_CONFIG}
      segments={segments}
      // 0에서 시작하지 않으면 낮은 시간대가 바닥에 붙어 추이가 과장된다.
      fromZero
      fromNumber={ceiling}
      bezier
      withInnerLines
      withVerticalLines={false}
      withOuterLines={false}
      withDots={false}
      yAxisLabel=""
      yAxisSuffix=""
      yLabelsOffset={Y_LABEL_OFFSET}
      style={Y_AXIS_GUTTER_STYLE}
    />
  );
}
