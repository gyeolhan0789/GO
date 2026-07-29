import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { BingoBoard } from '../../../features/bingo/components/BingoBoard/BingoBoard';
import type { BingoBoardSize } from '../../../features/bingo/components/BingoBoard/BingoBoard';
import type { BingoCellOwner } from '../../../features/history/model/walkDetail';
import {
  countCompletedCells,
  resolveBingoCellOwner,
} from '../../../features/history/model/walkDetail';
import type { WalkBingoCell } from '../../../features/history/types';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';

type WalkBingoCardProps = {
  size: BingoBoardSize;
  cells: WalkBingoCell[];
  /** 본인. 이 사람이 완료한 칸이 초록으로 칠해진다. */
  myMemberId: number;
};

const CHECK_SIZE = 22;
const INFO_ICON_SIZE = 20;

/** 미완료 칸은 색을 주지 않는다. */
const OWNER_STYLE: Record<
  BingoCellOwner,
  { background?: string; check?: string }
> = {
  mine: { background: colors.successBg, check: colors.successText },
  other: { background: colors.highlightSoftBg, check: colors.highlightText },
  none: {},
};

export function WalkBingoCard({
  size,
  cells,
  myMemberId,
}: WalkBingoCardProps) {
  const [isLegendOpen, setLegendOpen] = useState(false);

  const completedCount = countCompletedCells(cells);
  const boardCells = cells.map(cell => {
    const owner = resolveBingoCellOwner(cell, myMemberId);
    const { background, check } = OWNER_STYLE[owner];

    return {
      id: `${cell.index}`,
      completed: owner !== 'none',
      color: background,
      icon: check ? (
        <Ionicons name="checkmark" size={CHECK_SIZE} color={check} />
      ) : undefined,
    };
  });

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>
          {`진행한 빙고판 ${completedCount}/${cells.length}`}
        </Text>
        <Pressable
          onPress={() => setLegendOpen(open => !open)}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel="빙고판 색 설명"
          accessibilityState={{ expanded: isLegendOpen }}
        >
          <Ionicons
            name="information-circle-outline"
            size={INFO_ICON_SIZE}
            color={colors.successText}
          />
        </Pressable>
      </View>

      {isLegendOpen ? (
        <View style={styles.legend}>
          <LegendRow color={colors.successBg} label="내가 완료" />
          <LegendRow color={colors.highlightSoftBg} label="다른 친구 완료" />
          <LegendRow color={colors.neutralBg} label="아직 미완료" />
        </View>
      ) : null}

      <View style={styles.board}>
        <BingoBoard size={size} cells={boardCells} />
      </View>
    </Card>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heading: {
    flexShrink: 1,
    fontFamily: 'BMDOHYEON',
    fontSize: 15,
    color: colors.ink,
  },
  legend: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendSwatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  legendLabel: {
    fontFamily: 'BMDOHYEON',
    fontSize: 12,
    color: colors.ink,
    opacity: 0.7,
  },
  board: {
    marginTop: spacing.md,
  },
});
