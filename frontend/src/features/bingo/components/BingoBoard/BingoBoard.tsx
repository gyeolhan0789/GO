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
  /**
   * 셀 크기는 보드 폭/칸 수에 따라 달라져서 고정 픽셀로는 칸에 비해 아이콘이
   * 너무 작아 보인다. cellSize(픽셀)를 받아 그때그때 맞는 크기로 그리는 함수도
   * 허용한다 — 크기가 고정이어도 되는 자리(텍스트 등)는 ReactNode를 그대로 쓴다.
   */
  icon?: ReactNode | ((cellSize: number) => ReactNode);
  /** 남이 검증을 기다리는 칸. 표시만 바꾸는 게 아니라 눌리지도 않는다. */
  pending?: boolean;
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
          disabled={!onCellPress || cell.pending === true}
          onPress={() => onCellPress?.(cell)}
        >
          <BingoCell
            completed={cell.completed}
            color={cell.color}
            pending={cell.pending}
          >
            {typeof cell.icon === 'function' ? cell.icon(cellSize) : cell.icon}
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
