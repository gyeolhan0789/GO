import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../../../shared/components/AppText/AppText';
import { AvatarStack } from '../../../../shared/components/AvatarStack/AvatarStack';
import { Card } from '../../../../shared/components/Card/Card';
import { colors } from '../../../../shared/constants/colors';
import { shadow } from '../../../../shared/constants/shadow';
import { spacing } from '../../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../../shared/constants/typography';
import { formatWalkDateRange } from '../../model/format';
import { GAME_MODE_LABEL } from '../../model/gameResult';
import type { WalkRecord } from '../../types';
import { WalkResultBadge } from '../WalkResultBadge/WalkResultBadge';

type WalkCardProps = {
  walk: WalkRecord;
  onPress: () => void;
};

const AVATAR_SIZE = 40;

/** 기록 화면의 '최근 산책'과 전체 목록 화면이 같이 쓴다. */
export function WalkCard({ walk, onPress }: WalkCardProps) {
  const summary = [
    GAME_MODE_LABEL[walk.mode],
    `미션 ${walk.myCompletedMissionCount}/${walk.boardCellCount}`,
  ].join(' · ');

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
            <View style={styles.titleRow}>
              <AppText style={styles.title} numberOfLines={1}>
                {walk.title}
              </AppText>
              <WalkResultBadge mode={walk.mode} isWin={walk.isWin} />
            </View>
            <AppText style={styles.meta} numberOfLines={1}>
              {formatWalkDateRange(walk.startedAt, walk.completedAt)}
            </AppText>
            <AppText style={styles.meta} numberOfLines={1}>
              {summary}
            </AppText>
          </View>

          <AvatarStack
            members={walk.participants.map(participant => ({
              id: String(participant.memberId),
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    // 배지가 밀려나지 않게 긴 방 이름은 제목 쪽에서 줄인다.
    flexShrink: 1,
    fontFamily: bodyFont.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  meta: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
});
