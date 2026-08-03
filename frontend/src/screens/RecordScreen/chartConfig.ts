import { colors } from '../../shared/constants/colors';
import { radius } from '../../shared/constants/radius';

const HEX_RADIX = 16;
const THOUSAND = 1000;

/** y축 라벨 자리. chart-kit 기본값 64는 '1.5K'짜리 라벨에 과하다. */
export const Y_AXIS_GUTTER = 40;
export const Y_LABEL_OFFSET = 8;

/**
 * marginRight를 함께 주면 안 된다. LineChart가 Svg 폭을 `width - marginRight`로
 * 계산해서 폭이 어긋난다. paddingRight만으로 충분하다 — View의 박스가 아니라
 * 안쪽 content box만 줄기 때문에 폭 고정된 Svg는 박스 끝까지 그려진다.
 */
export const Y_AXIS_GUTTER_STYLE = {
  paddingRight: Y_AXIS_GUTTER,
};

const CHART_KIT_BAR_BASE = 32;
/** 막대가 칸에서 차지하는 폭. 칸 오른쪽 끝에 붙는다(resolveBarPercentage 참고). */
export const BAR_SLOT_RATIO = 2 / 3;

/**
 * chart-kit은 막대 폭을 `32 * barPercentage`로만 계산해서 차트가 넓어져도 굵어지지
 * 않는다. 그래서 비율을 실제 폭에서 구한다.
 *
 * 2/3인 이유: 막대를 칸 시작점에서 `barWidth / 2`만큼 밀어 그리므로,
 * `(n-1)*slot + barWidth/2 + barWidth = n*slot` -> `barWidth = slot * 2/3`.
 * 칸 폭에 그대로 맞추면 마지막 막대가 오른쪽으로 삐져나간다.
 */
export function resolveBarPercentage(
  plotWidth: number,
  barCount: number,
): number {
  if (plotWidth <= 0 || barCount <= 0) {
    return 1;
  }

  const slotWidth = plotWidth / barCount;
  return (slotWidth * BAR_SLOT_RATIO) / CHART_KIT_BAR_BASE;
}

/** chart-kit은 색을 hex가 아니라 `(opacity) => string` 함수로 받는다. */
function toRgba(hex: string): (opacity: number) => string {
  const red = parseInt(hex.slice(1, 3), HEX_RADIX);
  const green = parseInt(hex.slice(3, 5), HEX_RADIX);
  const blue = parseInt(hex.slice(5, 7), HEX_RADIX);

  return (opacity: number) => `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export const highlightedBarColor = toRgba(colors.primary);
export const barColor = toRgba(colors.primarySoft);

// chart-kit이 배경 Rect를 항상 그려서, 투명하게 하려면 opacity를 0으로 줘야 한다.
const TRANSPARENT_BACKGROUND = {
  backgroundGradientFrom: colors.surface,
  backgroundGradientFromOpacity: 0,
  backgroundGradientTo: colors.surface,
  backgroundGradientToOpacity: 0,
};

const LABEL_FONT = {
  fontFamily: 'BMDOHYEON',
  fontSize: 11,
};

const DASHED_GRID_LINES = {
  stroke: colors.neutralBg,
  strokeDasharray: '4 4',
  strokeWidth: 1,
};

/** 20000 -> '20K', 1500 -> '1.5K'. 반올림하면 눈금이 실제 값과 어긋난다. */
function formatStepTick(label: string): string {
  const value = Number(label);

  if (!Number.isFinite(value)) {
    return label;
  }

  if (Math.abs(value) < THOUSAND) {
    return `${value}`;
  }

  const thousands = value / THOUSAND;
  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
}

const SHARED_CHART_CONFIG = {
  ...TRANSPARENT_BACKGROUND,
  labelColor: toRgba(colors.mutedStrong),
  decimalPlaces: 0,
  formatYLabel: formatStepTick,
  propsForLabels: LABEL_FONT,
  propsForBackgroundLines: DASHED_GRID_LINES,
};

export const BAR_CHART_CONFIG = {
  ...SHARED_CHART_CONFIG,
  color: barColor,
  barRadius: radius.xs,
};

export const HOUR_LINE_CHART_CONFIG = {
  ...SHARED_CHART_CONFIG,
  color: highlightedBarColor,
  strokeWidth: 3,
  fillShadowGradient: colors.primarySoft,
  fillShadowGradientFrom: colors.primarySoft,
  fillShadowGradientFromOpacity: 0.35,
  fillShadowGradientTo: colors.surface,
  fillShadowGradientToOpacity: 0,
};
