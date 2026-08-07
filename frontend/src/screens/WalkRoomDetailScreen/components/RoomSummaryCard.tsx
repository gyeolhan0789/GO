import { StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { GAME_MODE_LABEL } from '../../../features/room/model/gameMode';
import type {
  GameRoomStatus,
  RoomDetailResponse,
} from '../../../features/room/api/roomApi';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Card } from '../../../shared/components/Card/Card';
import { ProgressBar } from '../../../shared/components/ProgressBar/ProgressBar';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type RoomSummaryCardProps = {
  room: RoomDetailResponse;
};

const STATUS_BADGE: Record<
  GameRoomStatus,
  { label: string; variant: 'success' | 'danger' }
> = {
  ACTIVE: { label: '진행 중', variant: 'success' },
  CLOSED: { label: '종료', variant: 'danger' },
};

/** 방 이름·상태와 공동 목표(걸음 수, 빙고 미션 진행)를 요약한다. */
export function RoomSummaryCard({ room }: RoomSummaryCardProps) {
  const status = STATUS_BADGE[room.status];
  const bingoTotal = room.totalMissionCount;
  const bingoCompleted = room.completedMissionCount;

  return (
    <Card>
      <View style={styles.titleRow}>
        <AppText style={styles.title} numberOfLines={2}>
          {room.name}
        </AppText>
        <View style={styles.badgeRow}>
          <Badge
            label={GAME_MODE_LABEL[room.mode]}
            variant={room.mode === 'SINGLE' ? 'info' : 'success'}
          />
          <Badge label={status.label} variant={status.variant} />
        </View>
      </View>

      {room.targetStepCount !== null ? (
        <View style={styles.goalRow}>
          <Ionicons name="walk" size={16} color={colors.successText} />
          <AppText style={styles.goalLabel}>이번 주 목표 걸음 수</AppText>
          <AppText style={styles.goalValue}>
            {`${room.targetStepCount.toLocaleString()}보`}
          </AppText>
        </View>
      ) : null}

      <View style={styles.bingoBlock}>
        <View style={styles.bingoLabelRow}>
          <AppText style={styles.goalLabel}>빙고 미션</AppText>
          <AppText style={styles.goalValue}>
            {`${bingoCompleted}/${bingoTotal}`}
          </AppText>
        </View>
        <ProgressBar
          progress={bingoTotal > 0 ? bingoCompleted / bingoTotal : 0}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    // 배지들을 밀어내지 않게 긴 방 이름은 제목 쪽에서 줄바꿈한다.
    flexShrink: 1,
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.ink,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  goalLabel: {
    flex: 1,
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.inkMuted,
  },
  goalValue: {
    fontFamily: bodyFont.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
  },
  bingoBlock: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  bingoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
