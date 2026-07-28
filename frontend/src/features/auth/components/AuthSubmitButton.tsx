import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

type AuthSubmitButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
};

const BACKGROUND_COLOR = '#2C6A47';
const DISABLED_BACKGROUND_COLOR = '#9CA3AF';
const LABEL_COLOR = '#FFFFFF';

const BUTTON_HEIGHT = 48;
const PRESSED_OPACITY = 0.8;

export function AuthSubmitButton({
  label,
  onPress,
  disabled = false,
  pending = false,
}: AuthSubmitButtonProps) {
  const isDisabled = disabled || pending;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isDisabled ? styles.buttonDisabled : null,
        pressed && !isDisabled ? styles.buttonPressed : null,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: pending }}>
      {pending ? (
        <ActivityIndicator color={LABEL_COLOR} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: BUTTON_HEIGHT,
    borderRadius: 8,
    backgroundColor: BACKGROUND_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: DISABLED_BACKGROUND_COLOR,
  },
  buttonPressed: {
    opacity: PRESSED_OPACITY,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: LABEL_COLOR,
  },
});
