import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily, textStyles } from '../../../shared/constants/typography';

type NicknameFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  maxLength: number;
  error?: string;
};

const FIELD_HEIGHT = 52;
const BORDER_COLOR = '#E5E7EB';

export function NicknameField({
  value,
  onChangeText,
  maxLength,
  error,
}: NicknameFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>닉네임</Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        <TextInput
          style={styles.input}
          accessibilityLabel="닉네임"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={maxLength}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="닉네임"
          placeholderTextColor={colors.muted}
        />
        <Text style={styles.counter}>
          {value.length}/{maxLength}
        </Text>
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.ink,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: FIELD_HEIGHT,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  fieldFocused: {
    borderColor: colors.primarySoft,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: colors.ink,
  },
  counter: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.mutedStrong,
  },
  error: {
    ...textStyles.caption,
    color: colors.danger,
  },
});
