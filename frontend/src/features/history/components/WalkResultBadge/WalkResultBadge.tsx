import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../../shared/constants/colors';
import { spacing } from '../../../../shared/constants/spacing';
import type { GameMode } from '../../../room/api/roomApi';
import { formatWalkResult } from '../../model/gameResult';

type WalkResultBadgeProps = {
  mode: GameMode;
  isWin: boolean;
};

/** 산책 목록과 상세가 같이 쓴다. 모드에 따라 '성공/실패'와 '승리/패배'로 갈린다. */
export function WalkResultBadge({ mode, isWin }: WalkResultBadgeProps) {
  return (
    <View style={[styles.badge, isWin ? styles.winBadge : styles.loseBadge]}>
      <Text style={[styles.label, isWin ? styles.winLabel : styles.loseLabel]}>
        {formatWalkResult(mode, isWin)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  winBadge: {
    backgroundColor: colors.successBg,
  },
  // 진 산책도 기록이라 붉게 칠하지 않는다.
  loseBadge: {
    backgroundColor: colors.neutralBg,
  },
  label: {
    fontFamily: 'BMDOHYEON',
    fontSize: 11,
  },
  winLabel: {
    color: colors.successText,
  },
  loseLabel: {
    color: colors.mutedStrong,
  },
});
