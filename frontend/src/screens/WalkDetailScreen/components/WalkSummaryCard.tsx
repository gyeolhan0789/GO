import { StyleSheet, View } from 'react-native';

import {
  formatDistance,
  formatThousands,
  formatWalkDateTime,
  formatWalkDuration,
} from '../../../features/history/model/format';
import type { WalkDetail } from '../../../features/history/types';
import { GAME_MODE_LABEL } from '../../../features/room/model/gameMode';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type WalkSummaryCardProps = {
  walk: WalkDetail;
};

/** 이 산책이 언제 어느 방에서 얼마나 걸은 것인지. */
export function WalkSummaryCard({ walk }: WalkSummaryCardProps) {
  const distance = formatDistance(walk.distanceMeters);

  return (
    <Card>
      <AppText style={styles.title} numberOfLines={2}>
        {walk.title}
      </AppText>
      <AppText style={styles.startedAt}>
        {`${GAME_MODE_LABEL[walk.mode]} · ${formatWalkDateTime(walk.startedAt)}`}
      </AppText>

      <View style={styles.heroRow}>
        <AppText style={styles.heroValue}>
          {formatThousands(walk.step)}
        </AppText>
        <AppText style={styles.heroUnit}>보</AppText>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <AppText style={styles.statValue}>
            {formatWalkDuration(walk.activeDurationSeconds)}
          </AppText>
          <AppText style={styles.statLabel}>걸은 시간</AppText>
        </View>
        <View style={styles.stat}>
          <AppText style={styles.statValue}>
            {distance.value}
            <AppText style={styles.statUnit}> {distance.unit}</AppText>
          </AppText>
          <AppText style={styles.statLabel}>이동 거리</AppText>
        </View>
        <View style={styles.stat}>
          <AppText style={styles.statValue}>
            {formatThousands(walk.calories)}
            <AppText style={styles.statUnit}> kcal</AppText>
          </AppText>
          <AppText style={styles.statLabel}>소모 칼로리</AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.ink,
  },
  startedAt: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.5,
    marginTop: spacing.xs,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  heroValue: {
    fontFamily: bodyFont.bold,
    fontSize: 30,
    lineHeight: lineHeights[30],
    color: colors.primary,
  },
  heroUnit: {
    fontFamily: bodyFont.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.primary,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
  statLabel: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
});
