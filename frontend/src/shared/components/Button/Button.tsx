import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons';

import { colors } from '../../constants/colors';
import { radius } from '../../constants/radius';
import { spacing } from '../../constants/spacing';
import { fontFamily } from '../../constants/typography';

type ButtonVariant = 'primary' | 'secondary';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IoniconsIconName;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
}: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
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
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
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
    opacity: 0.8,
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
