import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { lineHeights } from '../../../shared/constants/typography';

type RoomInviteRequestsSummaryCardProps = {
  receivedCount: number;
  onPress: () => void;
};

const LABEL = '산책방 초대';
const ICON_SIZE = 20;
const CHEVRON_SIZE = 20;

/** 받은 산책방 초대를 한 카드로 요약해 상세 화면(RoomInvites)으로 안내한다. */
export function RoomInviteRequestsSummaryCard({
  receivedCount,
  onPress,
}: RoomInviteRequestsSummaryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={LABEL}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="walk" size={ICON_SIZE} color={colors.successText} />
      </View>
      <View style={styles.textGroup}>
        <AppText style={styles.label} numberOfLines={1}>
          {LABEL}
        </AppText>
        <AppText style={styles.description} numberOfLines={1}>
          받은 초대 {receivedCount}건
        </AppText>
      </View>
      <Ionicons
        name="chevron-forward"
        size={CHEVRON_SIZE}
        color={colors.muted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 카드 컴포넌트(굵은 잉크 테두리 + 오프셋 그림자) 대신, 목록 위에 뜬 알림
  // 배너처럼 테두리 없이 옅은 배경만 깐다. FriendRequestsSummaryCard와 동일한 형태.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
    // FriendRequestsSummaryCard(successBg)와 같은 형태의, 무채색 회색 배너.
    backgroundColor: '#e3e3e3',
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
