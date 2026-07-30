import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { BingoBoard } from '../../../features/bingo/components/BingoBoard/BingoBoard';
import type { BingoBoardSize } from '../../../features/bingo/components/BingoBoard/BingoBoard';
import type { BingoCellOwner } from '../../../features/history/model/walkDetail';
import {
  countCellsByOwner,
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
  /** 본인. 이 사람이 깬 칸이 초록으로 칠해진다. */
  myMemberId: number;
};

const CHECK_SIZE = 22;
const SWATCH_SIZE = 14;

/** 미완료 칸은 색을 주지 않는다. */
const OWNER_STYLE: Record<
  BingoCellOwner,
  { background?: string; check?: string }
> = {
  mine: { background: colors.successBg, check: colors.successText },
  other: { background: colors.highlightSoftBg, check: colors.highlightText },
  none: {},
};

const LEGEND: { owner: BingoCellOwner; label: string; swatch: string }[] = [
  { owner: 'mine', label: '내가 깬 칸', swatch: colors.successBg },
  { owner: 'other', label: '친구가 깬 칸', swatch: colors.highlightSoftBg },
  { owner: 'none', label: '못 깬 칸', swatch: colors.neutralBg },
];

export function WalkBingoCard({ size, cells, myMemberId }: WalkBingoCardProps) {
  const completedCount = countCompletedCells(cells);
  const countsByOwner = countCellsByOwner(cells, myMemberId);

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
      <Text style={styles.heading}>
        {`진행한 빙고판 ${completedCount}/${cells.length}`}
      </Text>

      {/* 누가 깼는지가 이 화면의 핵심이라 범례를 접어두지 않고 늘 펼쳐 둔다. */}
      <View style={styles.legend}>
        {LEGEND.map(({ owner, label, swatch }) => (
          <View key={owner} style={styles.legendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: swatch }]} />
            <Text style={styles.legendLabel}>{label}</Text>
            <Text
              style={styles.legendCount}
            >{`${countsByOwner[owner]}칸`}</Text>
          </View>
        ))}
      </View>

      <View style={styles.board}>
        <BingoBoard size={size} cells={boardCells} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: 'BMDOHYEON',
    fontSize: 15,
    color: colors.ink,
  },
  legend: {
    flexDirection: 'row',
    // 좁은 화면에서 잘리지 않게 다음 줄로 넘긴다.
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendSwatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
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
  legendCount: {
    fontFamily: 'BMDOHYEON',
    fontSize: 12,
    color: colors.ink,
  },
  board: {
    marginTop: spacing.md,
  },
});
