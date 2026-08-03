import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { shadow } from '../../../shared/constants/shadow';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type FriendRequestsMenuRowProps = {
  onPress: () => void;
};

const LABEL = '친구 추가 내역';
const CHEVRON_SIZE = 20;

/**
 * 마이페이지에서 '내가 보낸 친구 요청' 화면으로 들어가는 줄.
 *
 * 대기 중인 요청 수를 여기 뱃지로 띄우려면 마이페이지가 열릴 때마다 목록을
 * 받아와야 한다. 개수는 상세 화면에서 바로 보이므로 그 비용을 지지 않는다.
 */
export function FriendRequestsMenuRow({ onPress }: FriendRequestsMenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={LABEL}
    >
      <Card style={styles.card}>
        <View style={styles.textGroup}>
          <AppText style={styles.label} numberOfLines={1}>
            {LABEL}
          </AppText>
          <AppText style={styles.description} numberOfLines={1}>
            내가 보낸 친구 요청을 확인하고 취소해요
          </AppText>
        </View>
        <Ionicons
          name="chevron-forward"
          size={CHEVRON_SIZE}
          color={colors.muted}
        />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // 카드 오프셋 그림자가 화면 폭 안에서 잘리지 않게.
    marginRight: shadow.offset,
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  label: {
    fontFamily: bodyFont.medium,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  description: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.inkMuted,
  },
});
