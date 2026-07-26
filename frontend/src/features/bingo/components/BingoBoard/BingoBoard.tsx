import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../../shared/constants/spacing';
import { useSquareGrid } from '../../hooks/useSquareGrid';
import { BingoCell } from '../BingoCell/BingoCell';

export type BingoBoardSize = 3 | 4 | 5;

type BingoBoardCell = {
  id: string;
  completed: boolean;
  /** Color of whoever completed this cell (see BingoCell). */
  color?: string;
  icon?: ReactNode;
};

type BingoBoardProps = {
  size: BingoBoardSize;
  cells: BingoBoardCell[];
};

const GAP = spacing.xs;

export function BingoBoard({ size, cells }: BingoBoardProps) {
  const { onLayout, cellSize } = useSquareGrid(size, GAP);

  return (
    <View style={styles.grid} onLayout={onLayout}>
      {cells.map((cell) => (
        <View key={cell.id} style={{ width: cellSize, height: cellSize }}>
          <BingoCell completed={cell.completed} color={cell.color}>
            {cell.icon}
          </BingoCell>
        </View>
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
