import { StyleSheet, View } from 'react-native';

import { WalkResultBadge } from '../../../features/history/components/WalkResultBadge/WalkResultBadge';
import { formatWalkDayRange } from '../../../features/history/model/format';
import { GAME_MODE_LABEL } from '../../../features/history/model/gameResult';
import type { WalkDetail } from '../../../features/history/types';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

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
        <AppText style={styles.title} numberOfLines={2}>
          {walk.title}
        </AppText>
        <WalkResultBadge mode={walk.mode} isWin={walk.isWin} />
      </View>
      <AppText style={styles.dayRange}>
        {`${GAME_MODE_LABEL[walk.mode]} · ${formatWalkDayRange(
          walk.startedAt,
          walk.completedAt,
        )}`}
      </AppText>
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
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.ink,
  },
  dayRange: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.5,
    marginTop: spacing.xs,
  },
});
