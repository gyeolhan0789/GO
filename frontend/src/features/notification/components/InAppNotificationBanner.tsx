import { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type InAppNotificationBannerProps = {
  title: string;
  body?: string;
  onPress: () => void;
  onHide: () => void;
  duration?: number;
};

const DEFAULT_DURATION = 4000;
const ANIMATION_DURATION = 220;

export function InAppNotificationBanner({
  title,
  body,
  onPress,
  onHide,
  duration = DEFAULT_DURATION,
}: InAppNotificationBannerProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-spacing.lg)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -spacing.lg,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          onHide();
        }
      });
    }, duration);

    return () => {
      clearTimeout(timer);
      opacity.stopAnimation();
      translateY.stopAnimation();
    };
  }, [duration, onHide, opacity, translateY]);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.overlay, { top: insets.top + spacing.sm }]}
    >
      <Animated.View
        style={[styles.animatedContainer, { opacity, transform: [{ translateY }] }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}, 알림 열기`}
          onPress={onPress}
          style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
        >
          <View style={styles.iconContainer}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.surface}
            />
          </View>

          <View style={styles.content}>
            <AppText numberOfLines={1} style={styles.title}>
              {title}
            </AppText>
            {body ? (
              <AppText numberOfLines={2} style={styles.body}>
                {body}
              </AppText>
            ) : null}
          </View>

          <Ionicons name="chevron-forward" size={20} color={colors.mutedStrong} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    elevation: 16,
  },
  animatedContainer: {
    borderRadius: radius.md,
  },
  banner: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  pressed: {
    opacity: 0.88,
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primaryDark,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.ink,
    fontFamily: bodyFont.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
  },
  body: {
    color: colors.inkMuted,
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
  },
});
