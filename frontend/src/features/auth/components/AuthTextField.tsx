import { forwardRef, useState } from 'react';
import type { ComponentProps, ForwardedRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { AppText } from '../../../shared/components/AppText/AppText';
import { controlHeight } from '../../../shared/constants/sizing';
import { colors } from '../../../shared/constants/colors';
import {
  bodyFont,
  lineHeights,
  MAX_FONT_SCALE,
} from '../../../shared/constants/typography';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type FocusHandler = NonNullable<TextInputProps['onFocus']>;
type BlurHandler = NonNullable<TextInputProps['onBlur']>;

type AuthTextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  /** 입력창 왼쪽 안에 표시할 Ionicons 이름. */
  leftIcon?: IoniconName;
  /** true면 눈 아이콘으로 비밀번호 표시/숨김을 토글한다. */
  secureToggle?: boolean;
  /** true면 우측에 `길이/maxLength` 카운터를 표시한다. maxLength가 필요하다. */
  showCount?: boolean;
  /** true면 상단 라벨 텍스트를 숨긴다. 접근성 라벨은 그대로 유지된다. */
  hideLabel?: boolean;
};

const LABEL_COLOR = colors.inkSoft;
const BORDER_COLOR = colors.border;
const FOCUS_BORDER_COLOR = colors.primaryDark;
const ERROR_COLOR = colors.danger;
const TEXT_COLOR = colors.ink;
const PLACEHOLDER_COLOR = colors.muted;
const LEFT_ICON_COLOR = '#8DC9A2';
const TRAILING_COLOR = colors.mutedStrong;
const EYE_COLOR = colors.primaryDark;

// 다른 입력창(친구 검색, 산책방 이름 등)과 같은 높이를 쓴다.
const INPUT_HEIGHT = controlHeight.md;
const ICON_SIZE = 20;

function AuthTextFieldBase(
  {
    label,
    error,
    leftIcon,
    secureToggle = false,
    showCount = false,
    hideLabel = false,
    style,
    value,
    maxLength,
    secureTextEntry,
    onFocus,
    onBlur,
    ...inputProps
  }: AuthTextFieldProps,
  ref: ForwardedRef<TextInput>,
) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  const isSecure = secureToggle ? !visible : secureTextEntry;
  const showCounter = showCount && typeof maxLength === 'number';
  const currentLength = typeof value === 'string' ? value.length : 0;

  const handleFocus: FocusHandler = event => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur: BlurHandler = event => {
    setFocused(false);
    onBlur?.(event);
  };

  return (
    <View style={styles.container}>
      {hideLabel ? null : <AppText style={styles.label}>{label}</AppText>}
      <View
        style={[
          styles.field,
          focused ? styles.fieldFocused : null,
          error ? styles.fieldError : null,
        ]}
      >
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={ICON_SIZE}
            color={LEFT_ICON_COLOR}
            style={styles.leftIcon}
          />
        ) : null}
        <TextInput
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={PLACEHOLDER_COLOR}
          autoCorrect={false}
          accessibilityLabel={label}
          value={value}
          maxLength={maxLength}
          secureTextEntry={isSecure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...inputProps}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setVisible(previous => !previous)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
            style={styles.trailing}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={ICON_SIZE}
              color={EYE_COLOR}
            />
          </Pressable>
        ) : showCounter ? (
          <AppText style={styles.counter}>
            {currentLength}/{maxLength}
          </AppText>
        ) : null}
      </View>
      {error ? (
        <AppText style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </AppText>
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
    fontFamily: bodyFont.medium,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: LABEL_COLOR,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: INPUT_HEIGHT,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
  },
  fieldFocused: {
    borderColor: FOCUS_BORDER_COLOR,
  },
  fieldError: {
    borderColor: ERROR_COLOR,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontFamily: bodyFont.regular,
    fontSize: 16,
    // TextInput에는 lineHeight를 주지 않는다(안드로이드에서 글자가 밀리거나
    // 잘린다). font padding을 끄고 세로 가운데로 맞춰야 입력값과 placeholder가
    // 같은 높이에 앉는다.
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: TEXT_COLOR,
  },
  trailing: {
    marginLeft: 8,
  },
  counter: {
    marginLeft: 8,
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: TRAILING_COLOR,
  },
  error: {
    marginTop: 4,
    marginLeft: 8,
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: ERROR_COLOR,
  },
});
