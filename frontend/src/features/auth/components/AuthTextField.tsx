import { forwardRef, useState } from 'react';
import type { ComponentProps, ForwardedRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TextInputProps } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

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
};

const LABEL_COLOR = '#374151';
const BORDER_COLOR = '#D1D5DB';
const FOCUS_BORDER_COLOR = '#2C6A47';
const ERROR_COLOR = '#DC2626';
const TEXT_COLOR = '#111827';
const PLACEHOLDER_COLOR = '#9CA3AF';
const LEFT_ICON_COLOR = '#8DC9A2';
const TRAILING_COLOR = '#6B7280';
const EYE_COLOR = '#2C6A47';

const INPUT_HEIGHT = 52;
const ICON_SIZE = 20;

function AuthTextFieldBase(
  {
    label,
    error,
    leftIcon,
    secureToggle = false,
    showCount = false,
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
      <Text style={styles.label}>{label}</Text>
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
          <Text style={styles.counter}>
            {currentLength}/{maxLength}
          </Text>
        ) : null}
      </View>
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
    fontSize: 16,
    color: TEXT_COLOR,
  },
  trailing: {
    marginLeft: 8,
  },
  counter: {
    marginLeft: 8,
    fontSize: 13,
    color: TRAILING_COLOR,
  },
  error: {
    marginTop: 4,
    fontSize: 13,
    color: ERROR_COLOR,
  },
});
