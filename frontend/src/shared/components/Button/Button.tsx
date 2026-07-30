import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons, {
  type IoniconsIconName,
} from '@react-native-vector-icons/ionicons';

import { colors } from '../../constants/colors';
import { radius } from '../../constants/radius';
import { shadow } from '../../constants/shadow';
import { spacing } from '../../constants/spacing';
import { fontFamily } from '../../constants/typography';

type ButtonVariant = 'primary' | 'secondary';
type ButtonSize = 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IoniconsIconName;
  disabled?: boolean;
  /** 바깥 래퍼(그림자 박스 포함)에 적용. flex:1 등 배치 제어용. */
  style?: StyleProp<ViewStyle>;
};

const HEIGHT_BY_SIZE: Record<ButtonSize, number> = {
  md: 56,
  lg: 68,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  style,
}: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.shadowBox} />
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.base,
          { height: HEIGHT_BY_SIZE[size] },
          isPrimary ? styles.primary : styles.secondary,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <View style={styles.content}>
          {icon ? (
            <Ionicons
              name={icon}
              size={20}
              color={isPrimary ? colors.surface : colors.ink}
              style={styles.icon}
            />
          ) : null}
          <Text
            style={[
              styles.label,
              isPrimary ? styles.labelPrimary : styles.labelSecondary,
            ]}
          >
            {label}
          </Text>
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
  },
  labelPrimary: {
    color: colors.surface,
  },
  labelSecondary: {
    color: colors.ink,
  },
});
