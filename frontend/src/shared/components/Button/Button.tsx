import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons, {
  type IoniconsIconName,
} from '@react-native-vector-icons/ionicons';

import { AppText } from '../AppText/AppText';
import { controlHeight } from '../../constants/sizing';
import { colors } from '../../constants/colors';
import { radius } from '../../constants/radius';
import { shadow } from '../../constants/shadow';
import { spacing } from '../../constants/spacing';
import { fontFamily, lineHeights } from '../../constants/typography';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IoniconsIconName;
  disabled?: boolean;
  /** label이 진행 상태에 따라 바뀌는 버튼에 고정된 이름을 주기 위한 값. */
  accessibilityLabel?: string;
  /** 바깥 래퍼(그림자 박스 포함)에 적용. flex:1 등 배치 제어용. */
  style?: StyleProp<ViewStyle>;
};

const HEIGHT_BY_SIZE: Record<ButtonSize, number> = {
  md: controlHeight.lg,
  lg: controlHeight.xl,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  accessibilityLabel,
  style,
}: ButtonProps) {
  // secondary만 밝은 면이라 잉크색 글씨, primary/danger는 어두운 면 위 흰 글씨.
  const contentColor = variant === 'secondary' ? colors.ink : colors.surface;

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.shadowBox} />
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.base,
          { height: HEIGHT_BY_SIZE[size] },
          VARIANT_STYLES[variant],
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <View style={styles.content}>
          {icon ? (
            <Ionicons
              name={icon}
              size={20}
              color={contentColor}
              style={styles.icon}
            />
          ) : null}
          <AppText style={[styles.label, { color: contentColor }]}>
            {label}
          </AppText>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  shadowBox: {
    position: 'absolute',
    top: shadow.offset,
    left: shadow.offset,
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  base: {
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [
      { translateX: shadow.offset / 2 },
      { translateY: shadow.offset / 2 },
    ],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    lineHeight: lineHeights[18],
  },
});

const VARIANT_STYLES: Record<ButtonVariant, StyleProp<ViewStyle>> = {
  primary: styles.primary,
  secondary: styles.secondary,
  danger: styles.danger,
};
