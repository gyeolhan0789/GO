import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../../../shared/components/AppText/AppText';
import { Card } from '../../../../shared/components/Card/Card';
import { colors } from '../../../../shared/constants/colors';
import { shadow } from '../../../../shared/constants/shadow';
import { spacing } from '../../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../../shared/constants/typography';
import { GAME_MODE_LABEL } from '../../../room/model/gameMode';
import {
  formatDistance,
  formatThousands,
  formatWalkDate,
  formatWalkDuration,
  formatWalkTimeRange,
} from '../../model/format';
import type { WalkRecord } from '../../types';

type WalkCardProps = {
  walk: WalkRecord;
  onPress: () => void;
};

/** 기록 화면의 '최근 산책'과 전체 목록 화면이 같이 쓴다. */
export function WalkCard({ walk, onPress }: WalkCardProps) {
  const distance = formatDistance(walk.distanceMeters);
  // 한 번의 산책이라 방이 며칠 열려 있었는지가 아니라 그날 언제 얼마나
  // 걸었는지가 카드의 내용이다.
  const meta = [
    GAME_MODE_LABEL[walk.mode],
    formatWalkDate(walk.startedAt),
    formatWalkDuration(walk.activeDurationSeconds),
  ].join(' · ');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${walk.title} 상세 보기`}
    >
      <Card>
        <AppText style={styles.title} numberOfLines={1}>
          {walk.title}
        </AppText>
        <AppText style={styles.meta} numberOfLines={1}>
          {meta}
        </AppText>
        <AppText style={styles.timeRange} numberOfLines={1}>
          {formatWalkTimeRange(walk.startedAt, walk.endedAt)}
        </AppText>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <AppText style={styles.statValue}>
              {formatThousands(walk.step)}
              <AppText style={styles.statUnit}> 보</AppText>
            </AppText>
          </View>
          <View style={styles.stat}>
            <AppText style={styles.statValue}>
              {distance.value}
              <AppText style={styles.statUnit}> {distance.unit}</AppText>
            </AppText>
          </View>
          <View style={styles.stat}>
            <AppText style={styles.statValue}>
              {formatThousands(walk.calories)}
              <AppText style={styles.statUnit}> kcal</AppText>
            </AppText>
          </View>
        </View>

        {walk.achievedMissionCount > 0 ? (
          <AppText style={styles.missions}>
            {`미션 ${walk.achievedMissionCount}개 달성`}
          </AppText>
        ) : null}
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
  title: {
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
    marginTop: spacing.xs,
  },
  timeRange: {
    fontFamily: bodyFont.bold,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.primaryDark,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  stat: {
    minWidth: 0,
  },
  statValue: {
    fontFamily: bodyFont.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  statUnit: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
  missions: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
    marginTop: spacing.xs,
  },
});
