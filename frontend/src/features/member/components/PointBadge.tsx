import { StyleSheet, View } from 'react-native';

import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../../shared/constants/typography';
import { formatPoints } from '../../../shared/lib/formatPoints';
import { sprites } from '../assets/sprites';
import { PixelSprite } from './PixelSprite';

type PointBadgeProps = {
  points: number;
};

const COIN_SIZE = 16;

/**
 * 보유 포인트 뱃지. 홈 헤더와 상점 헤더가 같이 쓴다 — 같은 값이 화면마다
 * 다른 모양이면 같은 돈으로 안 보인다. 헤더 제목 줄(32)과 같은 높이라 어느
 * 헤더 옆에 놓아도 헤더 키를 밀어내지 않는다.
 */
const BADGE_HEIGHT = 32;

export function PointBadge({ points }: PointBadgeProps) {
  return (
    <View
      style={styles.badge}
      accessibilityRole="text"
      accessibilityLabel={`보유 포인트 ${formatPoints(points)}`}
    >
      <PixelSprite sprite={sprites.coin} size={COIN_SIZE} />
      <AppText style={styles.label}>{formatPoints(points)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: BADGE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[12],
    color: colors.surface,
  },
});
