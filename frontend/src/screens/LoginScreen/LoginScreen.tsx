import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { AuthSubmitButton } from '../../features/auth/components/AuthSubmitButton';
import { AuthTextField } from '../../features/auth/components/AuthTextField';
import { SocialAuthButtons } from '../../features/auth/components/SocialAuthButtons';
import { useLoginMutation } from '../../features/auth/hooks/useLoginMutation';
import { useSocialAuthFlow } from '../../features/auth/hooks/useSocialAuthFlow';
import type { SocialSignupHandoff } from '../../features/auth/hooks/useSocialAuthFlow';
import { validateLogin } from '../../features/auth/model/validation';
import type { LoginErrors } from '../../features/auth/model/validation';
import { resolveApiErrorMessage } from '../../shared/api/resolveApiErrorMessage';
import { AppText } from '../../shared/components/AppText/AppText';
import { Screen } from '../../shared/components/Screen/Screen';
import { colors } from '../../shared/constants/colors';
import {
  bodyFont,
  fontFamily,
  lineHeights,
} from '../../shared/constants/typography';
import { useHasLoggedInBefore } from '../../shared/hooks/useHasLoggedInBefore';
// 상단 픽셀아트 배너는 회원가입 화면의 히어로를 그대로 재활용한다.
import { SignupHero } from '../SignupScreen/components/SignupHero';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

const TITLE_COLOR = colors.ink;
const SUBTITLE_COLOR = colors.inkMuted;
const ERROR_COLOR = colors.danger;
const HINT_COLOR = colors.mutedStrong;
const PRIMARY_COLOR = colors.primary;
const DIVIDER_COLOR = colors.borderSoft;
const TIP_BG_COLOR = colors.successBg;
const TIP_TITLE_COLOR = colors.inkSoft;

// 본문 view가 사진을 덮는 오버랩 높이와 상단 라운드 반경. 회원가입과 동일 규격.
const BODY_OVERLAP = 24;
const BODY_CORNER_RADIUS = 24;

// 텍스트 링크는 버튼(AuthSubmitButton, 0.8)보다 더 흐려져야 눌린 게 보인다.
const PRESSED_OPACITY = 0.6;

const SCREEN_EDGES = ['bottom'] as const;

export function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});

  const passwordRef = useRef<TextInput>(null);
  const mutation = useLoginMutation();
  const { hasLoggedInBefore } = useHasLoggedInBefore();

  // 회원가입 화면은 필드가 많아 올라오기까지 한 박자 걸린다. 그동안 링크를 눌린
  // 상태로 두고, 뒤로 돌아와 이 화면이 다시 포커스되면 되돌린다. navigate는
  // 동기라서 기다릴 대상이 없어 포커스로 판단한다.
  const [isLeavingToSignup, setIsLeavingToSignup] = useState(false);
  // 상태는 렌더 시점 값이라 같은 프레임에 두 번 눌리면 가드를 둘 다 통과한다
  // (disabled도 리렌더 후에야 걸린다). 동기로 바뀌는 ref로 막는다.
  const isLeavingToSignupRef = useRef(false);

  useEffect(
    () =>
      navigation.addListener('focus', () => {
        isLeavingToSignupRef.current = false;
        setIsLeavingToSignup(false);
      }),
    [navigation],
  );

  const social = useSocialAuthFlow(
    useCallback(
      (handoff: SocialSignupHandoff) => {
        navigation.navigate('SocialSignup', handoff);
      },
      [navigation],
    ),
  );

  function clearError(field: keyof LoginErrors) {
    setErrors(previous => ({ ...previous, [field]: undefined }));
    mutation.reset();
  }

  function notReady() {
    Alert.alert('준비 중', '아직 준비 중인 기능이에요.');
  }

  function goToSignup() {
    if (isLeavingToSignupRef.current) {
      return;
    }
    isLeavingToSignupRef.current = true;
    setIsLeavingToSignup(true);
    // 회원가입 화면은 입력 필드가 많아 마운트가 JS 스레드를 한동안 붙잡는다.
    // 같은 프레임에서 navigate를 부르면 스피너가 화면에 올라가기 전에 스레드가
    // 막혀, 회원가입 화면이 다 그려진 뒤에야 스피너가 잠깐 보인다. 한 프레임
    // 넘겨서 스피너를 먼저 그린 다음 이동한다.
    requestAnimationFrame(() => {
      navigation.navigate('Signup');
    });
  }

  function submit() {
    const nextErrors = validateLogin({ email, password });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    // 성공 후 화면 전환은 RootNavigator가 맡는다. 토큰이 저장되면 인증 화면들이
    // 스택에서 빠지고 Main만 남으므로 여기서 직접 이동할 필요가 없다.
    mutation.mutate({ email: email.trim(), password });
  }

  return (
    <Screen edges={SCREEN_EDGES}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <SignupHero />

          <View style={styles.body}>
            <AppText style={styles.title}>
              {hasLoggedInBefore ? '다시 만나서 반가워요!' : '만나서 반가워요!'}
            </AppText>
            <AppText style={styles.subtitle}>
              계정으로 로그인하고 산책을 기록해보세요.
            </AppText>

            <AuthTextField
              label="이메일 주소"
              hideLabel
              leftIcon="person-outline"
              value={email}
              placeholder="이메일 주소"
              onChangeText={text => {
                // 이메일에는 공백이 들어갈 수 없다. 자동완성이 뒤에 붙이는 공백을
                // 바로 지워 화면에 보이는 값과 보내는 값을 같게 만든다.
                setEmail(text.trim());
                clearError('email');
              }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <AuthTextField
              ref={passwordRef}
              label="비밀번호"
              hideLabel
              leftIcon="lock-closed-outline"
              secureToggle
              value={password}
              placeholder="비밀번호"
              onChangeText={text => {
                setPassword(text);
                clearError('password');
              }}
              error={errors.password}
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            <Pressable
              style={styles.forgot}
              onPress={notReady}
              accessibilityRole="button"
            >
              <AppText style={styles.forgotText}>비밀번호 찾기</AppText>
            </Pressable>

            {mutation.error ? (
              <AppText
                style={styles.serverError}
                accessibilityLiveRegion="polite"
              >
                {resolveApiErrorMessage(mutation.error)}
              </AppText>
            ) : null}

            <AuthSubmitButton
              label="로그인"
              onPress={submit}
              pending={mutation.isPending}
            />

            {isLeavingToSignup ? (
              <ActivityIndicator
                style={styles.signupSpinner}
                size="small"
                color={PRIMARY_COLOR}
              />
            ) : (
              <Pressable
                // 눌림 효과는 JS 상태를 거치지 않아 즉시 반응한다. 스피너가 뜨기
                // 전 한 프레임을 이걸로 메운다.
                style={({ pressed }) => [
                  styles.signupLink,
                  pressed && !isLeavingToSignup
                    ? styles.signupLinkPressed
                    : null,
                ]}
                onPress={goToSignup}
                disabled={isLeavingToSignup}
                accessibilityRole="button"
                accessibilityLabel="회원가입"
                accessibilityState={{
                  disabled: isLeavingToSignup,
                  busy: isLeavingToSignup,
                }}
              >
                <AppText style={styles.signupText}>
                  계정이 없으신가요?{' '}
                  <AppText style={styles.signupAccent}>회원가입</AppText>
                </AppText>
              </Pressable>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <AppText style={styles.dividerText}>또는</AppText>
              <View style={styles.dividerLine} />
            </View>

            {social.errorMessage ? (
              <AppText
                style={styles.serverError}
                accessibilityLiveRegion="polite"
              >
                {social.errorMessage}
              </AppText>
            ) : null}

            <SocialAuthButtons
              action="로그인"
              onKakaoPress={() => social.start('KAKAO')}
              onGooglePress={() => social.start('GOOGLE')}
              pendingProvider={social.pendingProvider}
            />

            <View style={styles.tip}>
              <AppText style={styles.tipTitle}>
                작은 습관이 변화를 만들어 낼 수 있습니다!
              </AppText>
              <AppText style={styles.tipBody}>
                오늘도 함께 걸으며 건강한 습관을 만들어봐요!
              </AppText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 32,
    backgroundColor: colors.surface,
  },
  body: {
    marginTop: -BODY_OVERLAP + 8,
    borderTopLeftRadius: BODY_CORNER_RADIUS,
    borderTopRightRadius: BODY_CORNER_RADIUS,
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingTop: BODY_OVERLAP + 20,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 26,
    lineHeight: lineHeights[26],
    color: TITLE_COLOR,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    fontFamily: bodyFont.regular,
    fontSize: 15,
    color: SUBTITLE_COLOR,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 20,
  },
  forgotText: {
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: HINT_COLOR,
  },
  serverError: {
    marginBottom: 12,
    fontFamily: bodyFont.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: ERROR_COLOR,
  },
  signupLink: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupLinkPressed: {
    opacity: PRESSED_OPACITY,
  },
  signupSpinner: {
    paddingTop: 14,
    paddingBottom: 8,
  },
  signupText: {
    fontFamily: bodyFont.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: SUBTITLE_COLOR,
  },
  signupAccent: {
    fontFamily: bodyFont.bold,
    color: PRIMARY_COLOR,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: DIVIDER_COLOR,
  },
  dividerText: {
    marginHorizontal: 12,
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: HINT_COLOR,
  },
  tip: {
    marginTop: 24,
    borderRadius: 16,
    backgroundColor: TIP_BG_COLOR,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tipTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: TIP_TITLE_COLOR,
    textAlign: 'center',
  },
  tipBody: {
    marginTop: 6,
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: HINT_COLOR,
    textAlign: 'center',
  },
});
