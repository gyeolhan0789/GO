import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

export function useSquareGrid(size: number, gap: number) {
  const [boardWidth, setBoardWidth] = useState(0);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setBoardWidth(event.nativeEvent.layout.width);
  }, []);

  const cellSize = boardWidth > 0 ? (boardWidth - gap * (size - 1)) / size : 0;

  return { onLayout, cellSize };
}
