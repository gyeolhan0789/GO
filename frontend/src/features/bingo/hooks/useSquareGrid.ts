import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

export function useSquareGrid(size: number, gap: number) {
  const [boardWidth, setBoardWidth] = useState(0);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setBoardWidth(event.nativeEvent.layout.width);
  }, []);

  // 소수점을 그대로 쓰면 칸 크기 합계가 기기 픽셀 반올림 방식에 따라 컨테이너
  // 폭을 미세하게 넘을 수 있고, flexWrap이라 그 순간 마지막 칸이 다음 줄로
  // 밀린다. 내림해서 합계가 항상 boardWidth 이하가 되도록 보장한다.
  const cellSize =
    boardWidth > 0 ? Math.floor((boardWidth - gap * (size - 1)) / size) : 0;

  return { onLayout, cellSize };
}
