import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

// 퍼센트 width는 ScrollView처럼 크기가 늦게 확정되는 부모 안에서 잘못
// 계산될 때가 있다. 컨테이너 자체의 실측 너비를 받아 자식에게 고정 픽셀
// width로 내려주는 용도로 쓴다.
export function useMeasuredWidth() {
  const [width, setWidth] = useState(0);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  return { width, onLayout };
}
