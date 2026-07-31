import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '../AppText/AppText';
import { colors } from '../../constants/colors';
import { fontFamily, lineHeights } from '../../constants/typography';

type RingProgressProps = {
  /** 0 to 1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
};

const DEFAULT_SIZE = 72;
const DEFAULT_STROKE_WIDTH = 8;

export function RingProgress({
  progress,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}: RingProgressProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.neutralBg}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="none"
          rotation={-90}
          originX={center}
          originY={center}
        />
      </Svg>
      <View style={styles.labelContainer} pointerEvents="none">
        <AppText style={styles.label}>{Math.round(clamped * 100)}%</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
  },
});
