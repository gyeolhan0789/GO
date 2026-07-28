import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';

type EquipResetButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

export function EquipResetButton({
  onPress,
  disabled = false,
}: EquipResetButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="착용 아이템 초기화"
      accessibilityState={{ disabled }}
    >
      <Ionicons name="refresh" size={16} color={colors.successText} />
      <Text style={styles.label}>착용 아이템 초기화</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.successBg,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: 'BMDOHYEON',
    fontSize: 14,
    color: colors.successText,
  },
});
