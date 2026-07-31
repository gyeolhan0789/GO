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
};

const DEFAULT_DURATION = 2000;
const ANIMATION_DURATION = 200;

export function Toast({
  message,
  onHide,
  duration = DEFAULT_DURATION,
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
        { bottom: insets.bottom + spacing.lg, opacity },
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
