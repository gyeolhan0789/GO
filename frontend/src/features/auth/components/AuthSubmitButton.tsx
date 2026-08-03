import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type AuthSubmitButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
};

const BACKGROUND_COLOR = colors.primaryDark;
const DISABLED_BACKGROUND_COLOR = colors.muted;
const LABEL_COLOR = colors.surface;

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
        <AppText style={styles.label}>{label}</AppText>
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
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: LABEL_COLOR,
  },
});
