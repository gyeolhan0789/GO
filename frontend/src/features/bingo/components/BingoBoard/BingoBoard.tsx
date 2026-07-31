import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '../../../../shared/constants/spacing';
import { useSquareGrid } from '../../hooks/useSquareGrid';
import { BingoCell } from '../BingoCell/BingoCell';

export type BingoBoardSize = 3 | 4 | 5;

export type BingoBoardCell = {
  id: string;
  completed: boolean;
  /** Color of whoever completed this cell (see BingoCell). */
  color?: string;
  icon?: ReactNode;
};

type BingoBoardProps = {
  size: BingoBoardSize;
  cells: BingoBoardCell[];
  /** 주면 칸이 눌린다(미션 상세 열기 등). 안 주면 순수 표시용. */
  onCellPress?: (cell: BingoBoardCell) => void;
};

const GAP = spacing.xs;

export function BingoBoard({ size, cells, onCellPress }: BingoBoardProps) {
  const { onLayout, cellSize } = useSquareGrid(size, GAP);

  return (
    <View style={styles.grid} onLayout={onLayout}>
      {cells.map((cell) => (
        <Pressable
          key={cell.id}
          style={{ width: cellSize, height: cellSize }}
          disabled={!onCellPress}
          onPress={() => onCellPress?.(cell)}
        >
          <BingoCell completed={cell.completed} color={cell.color}>
            {cell.icon}
          </BingoCell>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
});
