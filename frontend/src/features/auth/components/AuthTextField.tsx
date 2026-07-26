import { forwardRef } from 'react';
import type { ForwardedRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

type AuthTextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

const LABEL_COLOR = '#374151';
const BORDER_COLOR = '#D1D5DB';
const ERROR_COLOR = '#DC2626';
const TEXT_COLOR = '#111827';
const PLACEHOLDER_COLOR = '#9CA3AF';

const INPUT_HEIGHT = 48;

function AuthTextFieldBase(
  { label, error, style, ...inputProps }: AuthTextFieldProps,
  ref: ForwardedRef<TextInput>,
) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={PLACEHOLDER_COLOR}
        autoCorrect={false}
        accessibilityLabel={label}
        {...inputProps}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export const AuthTextField = forwardRef(AuthTextFieldBase);

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '600',
    color: LABEL_COLOR,
  },
  input: {
    height: INPUT_HEIGHT,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    fontSize: 16,
    color: TEXT_COLOR,
  },
  inputError: {
    borderColor: ERROR_COLOR,
  },
  error: {
    marginTop: 4,
    fontSize: 13,
    color: ERROR_COLOR,
  },
});
