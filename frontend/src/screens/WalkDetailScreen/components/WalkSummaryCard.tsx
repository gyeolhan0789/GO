import { StyleSheet, Text, View } from 'react-native';

import { WalkResultBadge } from '../../../features/history/components/WalkResultBadge/WalkResultBadge';
import { formatWalkDayRange } from '../../../features/history/model/format';
import { GAME_MODE_LABEL } from '../../../features/history/model/gameResult';
import type { WalkDetail } from '../../../features/history/types';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';

type WalkSummaryCardProps = {
  walk: WalkDetail;
};

/**
 * 어떤 방이었는지만 알려준다. 미션·빙고·포인트 수치는 빙고판이 그대로 보여주므로
 * 따로 세지 않는다.
 */
export function WalkSummaryCard({ walk }: WalkSummaryCardProps) {
  return (
    <Card>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={2}>
          {walk.title}
        </Text>
        <WalkResultBadge mode={walk.mode} isWin={walk.isWin} />
      </View>
      <Text style={styles.dayRange}>
        {`${GAME_MODE_LABEL[walk.mode]} · ${formatWalkDayRange(
          walk.startedAt,
          walk.completedAt,
        )}`}
      </Text>
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
    // 배지를 밀어내지 않게 긴 방 이름은 제목 쪽에서 줄바꿈한다.
    flexShrink: 1,
    fontFamily: 'BMDOHYEON',
    fontSize: 16,
    color: colors.ink,
  },
  dayRange: {
    fontFamily: 'NotoSansKR-Medium',
    fontSize: 12,
    color: colors.ink,
    opacity: 0.5,
    marginTop: spacing.xs,
  },
});
