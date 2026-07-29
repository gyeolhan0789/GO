import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily } from '../../../shared/constants/typography';

type HomeHeaderProps = {
  points: number;
};

export function HomeHeader({ points }: HomeHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.pointsBadge}>
        <View style={styles.coinDot} />
        <Text style={styles.pointsText}>{points}</Text>
      </View>
      <View style={styles.actions}>
        <Ionicons name="notifications-outline" size={24} color={colors.ink} />
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color={colors.muted} />
        </View>
      </View>
    </View>
  );
}

const COIN_COLOR = colors.highlightBg;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  coinDot: {
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: COIN_COLOR,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  pointsText: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.ink,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
