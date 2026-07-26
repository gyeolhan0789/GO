import { StyleSheet, View } from 'react-native';

import { colors } from '../../../../shared/constants/colors';
import { radius } from '../../../../shared/constants/radius';
import { useSquareGrid } from '../../hooks/useSquareGrid';
import type { BingoBoardSize } from '../BingoBoard/BingoBoard';

export type BingoThumbnailCellState = 'completed' | 'missed' | 'empty';

type BingoThumbnailProps = {
  size: BingoBoardSize;
  cellStates: BingoThumbnailCellState[];
};

const GAP = 2;

const CELL_COLOR: Record<BingoThumbnailCellState, string> = {
  completed: colors.primary,
  missed: colors.danger,
  empty: colors.neutralBg,
};

export function BingoThumbnail({ size, cellStates }: BingoThumbnailProps) {
  const { onLayout, cellSize } = useSquareGrid(size, GAP);

  return (
    <View style={styles.grid} onLayout={onLayout}>
      {cellStates.map((state, index) => (
        <View
          key={index}
          style={{
            width: cellSize,
            height: cellSize,
            borderRadius: radius.xs,
            backgroundColor: CELL_COLOR[state],
          }}
        />
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
