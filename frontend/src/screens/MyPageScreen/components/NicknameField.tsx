import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily, lineHeights, MAX_FONT_SCALE, textStyles } from '../../../shared/constants/typography';

type NicknameFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  maxLength: number;
  error?: string;
};

const FIELD_HEIGHT = 52;
const BORDER_COLOR = colors.borderSoft;

export function NicknameField({
  value,
  onChangeText,
  maxLength,
  error,
}: NicknameFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <AppText style={styles.label}>닉네임</AppText>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        <TextInput
          maxFontSizeMultiplier={MAX_FONT_SCALE}
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
        <AppText style={styles.counter}>
          {value.length}/{maxLength}
        </AppText>
      </View>
      {error ? (
        <AppText style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </AppText>
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
    lineHeight: lineHeights[14],
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
    // TextInput에는 lineHeight를 주지 않는다(안드로이드에서 글자가 밀린다).
    // font padding을 끄고 한 줄 입력이라 세로 가운데로 맞춘다.
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: colors.ink,
  },
  counter: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.mutedStrong,
  },
  error: {
    ...textStyles.caption,
    color: colors.danger,
  },
});
