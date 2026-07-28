import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { sprites } from '../assets/sprites';
import { formatPoints } from '../format';
import { PixelSprite } from './PixelSprite';

type PointBadgeProps = {
  points: number;
};

const COIN_SIZE = 18;
const BADGE_HEIGHT = 40;
// 코인과 글자가 같은 높이의 박스를 갖게 해서 세로 중앙이 정확히 맞도록 한다.
const CONTENT_HEIGHT = 32;

export function PointBadge({ points }: PointBadgeProps) {
  return (
    <View style={styles.wrapper}>
      <View
        style={styles.badge}
        accessibilityRole="text"
        accessibilityLabel={`보유 포인트 ${formatPoints(points)}`}
      >
        <View style={styles.coin}>
          <PixelSprite sprite={sprites.coin} size={COIN_SIZE} />
        </View>
        <Text style={styles.label}>{formatPoints(points)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: BADGE_HEIGHT,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  coin: {
    width: COIN_SIZE,
    height: CONTENT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'NotoSansKR-Bold',
    fontSize: 16,
    height: CONTENT_HEIGHT,
    lineHeight: CONTENT_HEIGHT,
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: colors.surface,
  },
});
