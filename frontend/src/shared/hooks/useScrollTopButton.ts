import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

// 한 화면쯤 내려갔을 때부터 맨 위로 버튼을 띄운다. 조금만 스크롤해도 뜨면 거슬린다.
const SHOW_AFTER_OFFSET = 600;

// 경계를 지나쳤는지 놓치지 않을 만큼 촘촘히 받는다(약 60fps).
export const SCROLL_THROTTLE_MS = 16;

type UseScrollTopButtonResult<T> = {
  listRef: RefObject<FlatList<T> | null>;
  isScrolledDown: boolean;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollToTop: () => void;
};

/**
 * 길게 스크롤되는 목록에 "맨 위로" 버튼을 달기 위한 상태 묶음.
 * 버튼 자체는 화면이 그린다 — 화면마다 띄울 자리가 다르기 때문이다.
 */
export function useScrollTopButton<T>(): UseScrollTopButtonResult<T> {
  const listRef = useRef<FlatList<T>>(null);
  const [isScrolledDown, setScrolledDown] = useState(false);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // 같은 값이면 React가 리렌더를 건너뛰므로 매 프레임 넣어도 괜찮다.
      setScrolledDown(event.nativeEvent.contentOffset.y > SHOW_AFTER_OFFSET);
    },
    [],
  );

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  return { listRef, isScrolledDown, handleScroll, scrollToTop };
}
