import { StyleSheet, View } from 'react-native';

import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';

type StepsProgressBarProps = {
  /** 0~100 사이로 클램프해 사용한다. */
  percent: number;
};

const SEGMENT_COUNT = 16;
const SEGMENT_GAP = 2;

export function StepsProgressBar({ percent }: StepsProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const filledCount = Math.round((clamped / 100) * SEGMENT_COUNT);

  return (
    <View style={styles.track}>
      {Array.from({ length: SEGMENT_COUNT }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            index < filledCount ? styles.segmentFilled : styles.segmentEmpty,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: SEGMENT_GAP,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.xs,
    padding: SEGMENT_GAP,
  },
  segment: {
    flex: 1,
    height: 14,
    borderRadius: 1,
  },
  segmentFilled: {
    backgroundColor: colors.successText,
  },
  segmentEmpty: {
    backgroundColor: colors.neutralBg,
  },
});
