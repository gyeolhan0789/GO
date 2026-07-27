import { StyleSheet, Text, View } from 'react-native';

import type { FriendResponse } from '../../../features/friend/api/friendApi';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { shadow } from '../../../shared/constants/shadow';
import { spacing } from '../../../shared/constants/spacing';

type FriendCardProps = {
  friend: FriendResponse;
};

export function FriendCard({ friend }: FriendCardProps) {
  return (
    <Card style={styles.card} wrapperStyle={styles.wrapper}>
      {/* TODO: equippedItems로 캐릭터 아바타 구성. 지금은 빈 원으로 대체. */}
      <View style={styles.avatar} />
      <View style={styles.textGroup}>
        <Text style={styles.name} numberOfLines={1}>
          {friend.nickname}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          이번 주 {friend.weeklySteps}보
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
