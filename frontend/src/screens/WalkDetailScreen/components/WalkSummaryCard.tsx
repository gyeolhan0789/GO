import { StyleSheet, View } from 'react-native';

import {
  formatDistance,
  formatThousands,
  formatWalkDayLabel,
  formatWalkDuration,
  formatWalkTime,
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
        {`${GAME_MODE_LABEL[walk.mode]} · ${formatWalkDayLabel(
          walk.startedAt,
        )}`}
      </AppText>

      {/* 걸은 시간(쉰 시간을 뺀 값)과 헷갈리지 않게 '나가 있던' 총 시간을
          시작~종료 옆에 같이 둔다. 둘의 차이가 쉰 시간이다. */}
      <View
        style={styles.timeRow}
        accessibilityRole="text"
        accessibilityLabel={
          `${formatWalkTime(walk.startedAt)}에 시작해 ` +
          `${formatWalkTime(walk.endedAt)}에 종료, ` +
          `총 ${formatWalkDuration(walk.durationSeconds)}`
        }
      >
        <View style={styles.timePoint}>
          <AppText style={styles.timeLabel}>시작</AppText>
          <AppText style={styles.timeValue}>
            {formatWalkTime(walk.startedAt)}
          </AppText>
        </View>
        <View>
          <AppText>~</AppText>
        </View>
        <View style={styles.timePoint}>
          <AppText style={styles.timeLabel}>종료</AppText>
          <AppText style={styles.timeValue}>
            {formatWalkTime(walk.endedAt)}
          </AppText>
        </View>
        <AppText style={styles.totalDuration}>
          {`총 ${formatWalkDuration(walk.durationSeconds)}`}
        </AppText>
      </View>

      <View style={styles.heroRow}>
        <AppText style={styles.heroValue}>{formatThousands(walk.step)}</AppText>
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  timePoint: {
    gap: 2,
  },
  timeLabel: {
    fontFamily: bodyFont.regular,
    fontSize: 11,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.5,
  },
  timeValue: {
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.ink,
  },
  totalDuration: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
    marginBottom: 3,
    marginLeft: 'auto',
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
