import { StyleSheet, View } from 'react-native';

import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../../shared/constants/typography';
import { StepsProgressBar } from './StepsProgressBar';

type StepsSummaryProps = {
  steps: number;
  goalSteps: number;
};

function formatWithComma(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function StepsSummary({ steps, goalSteps }: StepsSummaryProps) {
  const percent = Math.round((steps / goalSteps) * 100);

  return (
    <View style={styles.container}>
      <AppText style={styles.label}>오늘 걸음</AppText>
      <View style={styles.valueRow}>
        <AppText style={styles.value}>{formatWithComma(steps)}</AppText>
        <AppText style={styles.unit}>보</AppText>
      </View>
      <View style={styles.progressBarWrapper}>
        <StepsProgressBar percent={percent} />
      </View>
      <AppText style={styles.goal}>
        목표 {formatWithComma(goalSteps)}보 · {percent}%
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    opacity: 0.6,
  },
  valueRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  value: {
    fontFamily: fontFamily.bold,
    fontSize: 30,
    lineHeight: lineHeights[30],
    color: colors.ink,
  },
  unit: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
    marginBottom: 3,
  },
  progressBarWrapper: {
    alignSelf: 'center',
    width: '80%',
  },
  goal: {
    textAlign: 'center',
    marginTop: spacing.xs,
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.successText,
  },
});
