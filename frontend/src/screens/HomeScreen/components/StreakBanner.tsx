import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily } from '../../../shared/constants/typography';

type StreakBannerProps = {
  streakDays: number;
};

export function StreakBanner({ streakDays }: StreakBannerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <Text style={styles.text}>연속 {streakDays}일째 산책 중이에요!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  dot: {
    marginLeft: spacing.xs,
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.successText,
  },
  text: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.successText,
  },
});
