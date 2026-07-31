import type { HistoryPeriod } from '../api/historyApi';

/** 데이터가 상한의 이 비율을 넘으면 다음 단계로 올려 천장에 붙지 않게 한다. */
const HEADROOM_RATIO = 0.9;

type CeilingLadder = {
  /** 기본 상한부터 순서대로. */
  steps: number[];
  /** steps를 다 쓴 뒤로는 이 값의 배수로 올린다. */
  increment: number;
};

/** 구간마다 그리는 단위가 다르다. DAY=시간대별, WEEK=하루별, MONTH=주별. */
const CEILING_LADDER: Record<HistoryPeriod, CeilingLadder> = {
  DAY: { steps: [2_000], increment: 500 },
  // 보통 하루가 6,000보쯤이라 8,000으로 둬야 여유가 보인다.
  WEEK: { steps: [8_000], increment: 2_000 },
  MONTH: { steps: [80_000], increment: 20_000 },
};

/**
 * chart-kit의 `fromNumber`로 넘길 y축 상한.
 * `fromNumber`는 최소 상한이라(데이터가 더 크면 데이터를 쓴다) 막대가 잘리지 않는다.
 */
export function resolveChartCeiling(
  period: HistoryPeriod,
  dataMax: number,
): number {
  const { steps, increment } = CEILING_LADDER[period];
  const required = dataMax / HEADROOM_RATIO;

  const fittingStep = steps.find(step => step >= required);
  if (fittingStep !== undefined) {
    return fittingStep;
  }

  // 마지막 단계로도 부족하면 increment 배수로 올린다.
  const lastStep = steps[steps.length - 1];
  const extraSteps = Math.ceil((required - lastStep) / increment);
  return lastStep + extraSteps * increment;
}

/** 차트 데이터에서 가장 큰 값. 빈 배열이면 0. */
export function maxValue(values: number[]): number {
  return values.reduce((max, value) => (value > max ? value : max), 0);
}
