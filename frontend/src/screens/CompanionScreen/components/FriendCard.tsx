import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { shadow } from '../../../shared/constants/shadow';
import { spacing } from '../../../shared/constants/spacing';
import type { Friend } from '../types';

type FriendCardProps = {
  friend: Friend;
};

export function FriendCard({ friend }: FriendCardProps) {
  return (
    <Card style={styles.card} wrapperStyle={styles.wrapper}>
      <View style={[styles.avatar, friend.isActive && styles.avatarActive]} />
      <View style={styles.textGroup}>
        <Text style={styles.name} numberOfLines={1}>
          {friend.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          최근 기록 : {friend.recentSteps}보
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // 카드 우측 오프셋 그림자(shadow.offset)가 리스트 폭 안에서 잘리지 않도록
    // 오른쪽에 그만큼 여백을 남긴다.
    alignSelf: 'stretch',
    marginRight: shadow.offset,
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
  avatarActive: {
    backgroundColor: colors.primary,
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: 'BMDOHYEON',
    fontSize: 15,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: 'BMDOHYEON',
    fontSize: 12,
    color: colors.ink,
    opacity: 0.6,
    marginTop: 2,
  },
});
