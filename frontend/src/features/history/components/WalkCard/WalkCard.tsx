import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarStack } from '../../../../shared/components/AvatarStack/AvatarStack';
import { Card } from '../../../../shared/components/Card/Card';
import { colors } from '../../../../shared/constants/colors';
import { shadow } from '../../../../shared/constants/shadow';
import { spacing } from '../../../../shared/constants/spacing';
import {
  formatDuration,
  formatThousands,
  formatWalkDateTime,
} from '../../model/format';
import type { RecentWalk } from '../../types';

type WalkCardProps = {
  walk: RecentWalk;
  onPress: () => void;
};

const AVATAR_SIZE = 40;

/** 기록 화면의 '최근 산책'과 전체 목록 화면이 같이 쓴다. */
export function WalkCard({ walk, onPress }: WalkCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${walk.title} 상세 보기`}
    >
      <Card>
        <View style={styles.row}>
          <View style={styles.textGroup}>
            <Text style={styles.title} numberOfLines={1}>
              {walk.title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {formatWalkDateTime(walk.startedAt)}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {`${formatThousands(walk.step)} 걸음 · ${formatDuration(
                walk.durationSeconds,
              )}`}
            </Text>
          </View>

          <AvatarStack
            members={walk.participants.map(participant => ({
              id: String(participant.memberId),
              imageUri: participant.imageUrl,
            }))}
            size={AVATAR_SIZE}
          />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // 카드 오프셋 그림자가 리스트 폭 안에서 잘리지 않게.
    marginRight: shadow.offset,
  },
  pressed: {
    opacity: 0.85,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  title: {
    fontFamily: 'BMDOHYEON',
    fontSize: 15,
    color: colors.ink,
  },
  meta: {
    fontFamily: 'BMDOHYEON',
    fontSize: 12,
    color: colors.ink,
    opacity: 0.6,
  },
});
