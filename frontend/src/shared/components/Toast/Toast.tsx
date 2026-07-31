import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../AppText/AppText';
import { colors } from '../../constants/colors';
import { radius } from '../../constants/radius';
import { spacing } from '../../constants/spacing';
import { fontFamily, lineHeights } from '../../constants/typography';

type ToastProps = {
  /** null이면 렌더링하지 않는다. */
  message: string | null;
  onHide: () => void;
  duration?: number;
  /**
   * 기기 하단 세이프에어리어만큼 더 띄울지. 탭 바 안에서 렌더링되는 화면은
   * 탭 바가 이미 그 인셋을 차지하므로 false로 꺼야 FAB 등 다른 하단 요소와
   * 높이가 맞는다. 기본값 true는 edges={['bottom']}을 쓰는 전체 화면 기준.
   */
  respectBottomInset?: boolean;
};

const DEFAULT_DURATION = 2000;
const ANIMATION_DURATION = 200;

export function Toast({
  message,
  onHide,
  duration = DEFAULT_DURATION,
  respectBottomInset = true,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) {
      return;
    }

    Animated.timing(opacity, {
      toValue: 1,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onHide();
        }
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onHide, opacity]);

  if (!message) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          bottom: (respectBottomInset ? insets.bottom : 0) + spacing.lg,
          opacity,
        },
      ]}
    >
      <AppText style={styles.text}>{message}</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  text: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.surface,
  },
});
