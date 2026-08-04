import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { lineHeights } from '../../../shared/constants/typography';

type FriendRequestsSummaryCardProps = {
  receivedCount: number;
  sentCount: number;
  onPress: () => void;
};

const LABEL = '친구 요청';
const ICON_SIZE = 20;
const CHEVRON_SIZE = 20;

/** 받은/보낸 친구 요청을 한 카드로 요약해 상세 화면(FriendRequests)으로 안내한다. */
export function FriendRequestsSummaryCard({
  receivedCount,
  sentCount,
  onPress,
}: FriendRequestsSummaryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={LABEL}
    >
      <View style={styles.iconCircle}>
        <Ionicons
          name="person-add"
          size={ICON_SIZE}
          color={colors.successText}
        />
      </View>
      <View style={styles.textGroup}>
        <AppText style={styles.label} numberOfLines={1}>
          {LABEL}
        </AppText>
        <AppText style={styles.description} numberOfLines={1}>
          받은 요청 {receivedCount}건 · 보낸 요청 {sentCount}건
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={CHEVRON_SIZE} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 카드 컴포넌트(굵은 잉크 테두리 + 오프셋 그림자) 대신, 목록 위에 뜬 알림
  // 배너처럼 테두리 없이 옅은 배경만 깐다.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.successBg,
  },
  pressed: {
    opacity: 0.85,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // 배너 배경(successBg)과 같은 색이면 묻히니 흰 원으로 띄운다.
    backgroundColor: colors.surface,
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  label: {
    fontFamily: 'BMDOHYEON',
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  description: {
    fontFamily: 'BMDOHYEON',
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
});
