import { Pressable, StyleSheet, View } from 'react-native';

import type { FriendResponse } from '../../../features/friend/api/friendApi';
import { MemberAvatar } from '../../../features/member/components/MemberAvatar';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { shadow } from '../../../shared/constants/shadow';
import { spacing } from '../../../shared/constants/spacing';
import { lineHeights } from '../../../shared/constants/typography';

type FriendCardProps = {
  friend: FriendResponse;
  onLongPress?: () => void;
};

export function FriendCard({ friend, onLongPress }: FriendCardProps) {
  return (
    <Pressable
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <Card style={styles.card}>
        <MemberAvatar
          gender={friend.gender}
          defaultImageUrl={friend.defaultImageUrl}
          equippedItems={friend.equippedItems}
          style={styles.avatar}
        />
        <View style={styles.textGroup}>
          <AppText style={styles.name} numberOfLines={1}>
            {friend.nickname}
          </AppText>
          <AppText style={styles.subtitle} numberOfLines={1}>
            이번 주 {friend.weeklySteps}보
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    // 카드 우측 오프셋 그림자(shadow.offset)가 리스트 폭 안에서 잘리지 않도록
    // 오른쪽에 그만큼 여백을 남긴다.
    alignSelf: 'stretch',
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralBg,
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: 'BMDOHYEON',
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  subtitle: {
    fontFamily: 'BMDOHYEON',
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
});
