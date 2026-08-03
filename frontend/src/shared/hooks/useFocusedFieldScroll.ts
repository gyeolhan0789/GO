import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { Keyboard } from 'react-native';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  TextInput,
} from 'react-native';

import { resolveRevealOffset } from '../lib/revealScrollOffset';
import { SCROLL_THROTTLE_MS } from './useScrollTopButton';

/** 입력창 위아래로 남길 여백. 라벨과 오류 문구가 함께 보일 만큼 띄운다. */
const REVEAL_MARGIN = 32;

type FieldRef = RefObject<TextInput | null>;

type UseFocusedFieldScrollResult = {
  scrollRef: RefObject<ScrollView | null>;
  scrollEventThrottle: number;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** 포커스가 옮겨간 입력창이 가려졌으면 보이는 자리까지 스크롤한다. */
  revealField: (field: FieldRef) => void;
};

/**
 * 폼 스크롤 뷰에서 방금 포커스된 입력창을 키보드 위로 끌어올린다.
 *
 * 스크롤 뷰 높이만 봐서는 가려진 걸 알 수 없다. targetSdk 35+ 엣지투엣지에서는
 * 키보드가 떠도 창이 줄지 않아 adjustResize가 아무 일도 하지 않기 때문이다.
 * 그래서 스크롤 뷰 아래 끝과 키보드 윗변 중 위에 있는 쪽을 실제 경계로 본다.
 */
export function useFocusedFieldScroll(): UseFocusedFieldScrollResult {
  const scrollRef = useRef<ScrollView>(null);
  const focusedField = useRef<FieldRef | null>(null);
  const offsetY = useRef(0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offsetY.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const revealField = useCallback((field: FieldRef) => {
    focusedField.current = field;

    const scroll = scrollRef.current;
    const viewport = scroll?.getNativeScrollRef();
    const input = field.current;
    if (!scroll || !viewport || !input) {
      return;
    }

    // 창 좌표로 재야 스크롤 뷰·입력창·키보드를 같은 자로 잴 수 있다.
    viewport.measureInWindow((_viewportX, viewportY, _width, height) => {
      input.measureInWindow((_x, fieldTop, _fieldWidth, fieldHeight) => {
        const keyboardTop = Keyboard.metrics()?.screenY;
        const scrollBottom = viewportY + height;

        const next = resolveRevealOffset({
          offsetY: offsetY.current,
          visibleTop: viewportY,
          visibleBottom:
            keyboardTop === undefined
              ? scrollBottom
              : Math.min(scrollBottom, keyboardTop),
          fieldTop,
          fieldHeight,
          margin: REVEAL_MARGIN,
        });

        if (next !== null) {
          scroll.scrollTo({ y: next, animated: true });
        }
      });
    });
  }, []);

  // 키보드가 처음 올라오는 순간엔 포커스 시점에 아직 키보드가 없어 가려질 걸
  // 모른다. 높이를 알게 된 지금 다시 맞춘다.
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      const field = focusedField.current;
      if (field?.current?.isFocused()) {
        revealField(field);
      }
    });
    return () => subscription.remove();
  }, [revealField]);

  return {
    scrollRef,
    scrollEventThrottle: SCROLL_THROTTLE_MS,
    handleScroll,
    revealField,
  };
}
