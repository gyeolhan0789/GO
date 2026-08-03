import { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { ConsentCheckboxes } from '../../features/auth/components/ConsentCheckboxes';
import { GenderSelector } from '../../features/auth/components/GenderSelector';
import { RegionDropdown } from '../../features/auth/components/RegionDropdown';
import { SocialAuthButtons } from '../../features/auth/components/SocialAuthButtons';
import { AppText } from '../../shared/components/AppText/AppText';
import type { Gender } from '../../features/auth/constants/genders';
import type { Region } from '../../features/auth/constants/regions';
import { useRegionDetection } from '../../features/auth/hooks/useRegionDetection';
import { useSignupMutation } from '../../features/auth/hooks/useSignupMutation';
import { useSocialAuthFlow } from '../../features/auth/hooks/useSocialAuthFlow';
import type { SocialSignupHandoff } from '../../features/auth/hooks/useSocialAuthFlow';
import {
  NICKNAME_MAX_LENGTH,
  validateSignup,
} from '../../features/auth/model/validation';
import type { SignupErrors } from '../../features/auth/model/validation';
import { Screen } from '../../shared/components/Screen/Screen';
import { colors } from '../../shared/constants/colors';
import { bodyFont, fontFamily, lineHeights } from '../../shared/constants/typography';
import { SignupCompleteModal } from './components/SignupCompleteModal';
import { SignupHero } from './components/SignupHero';

type SignupScreenProps = NativeStackScreenProps<RootStackParamList, 'Signup'>;

const LABEL_COLOR = colors.inkSoft;
const ERROR_COLOR = colors.danger;
const ACCENT_COLOR = colors.primaryDark;
const HINT_COLOR = colors.mutedStrong;
const TITLE_COLOR = colors.ink;
const SUBTITLE_COLOR = colors.inkMuted;
const PRIMARY_COLOR = colors.primary;
const DIVIDER_COLOR = colors.borderSoft;

// 본문 view가 사진을 덮는 오버랩 높이와 상단 라운드 반경.
const BODY_OVERLAP = 24;
const BODY_CORNER_RADIUS = 24;

const SCREEN_EDGES = ['bottom'] as const;

export function SignupScreen({ navigation }: SignupScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [region, setRegion] = useState<Region | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [isSignupComplete, setIsSignupComplete] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const passwordConfirmRef = useRef<TextInput>(null);
  const nicknameRef = useRef<TextInput>(null);
  const mutation = useSignupMutation();
  const {
    status: detectionStatus,
    detectIfPermitted,
    detect,
  } = useRegionDetection();

  const social = useSocialAuthFlow(
    useCallback(
      (handoff: SocialSignupHandoff) => {
        navigation.navigate('SocialSignup', handoff);
      },
      [navigation],
    ),
  );

  // 위치 권한이 이미 허용된 경우에만 진입 시 조용히 지역을 채운다. 사용자가 아직
  // 아무 지역도 고르지 않았을 때만 반영해 수동 선택을 덮어쓰지 않는다.
  useEffect(() => {
    let active = true;
    detectIfPermitted().then(detected => {
      if (active && detected) {
        setRegion(previous => previous ?? detected);
      }
    });
    return () => {
      active = false;
    };
  }, [detectIfPermitted]);

  async function detectRegion() {
    const detected = await detect();
    if (detected) {
      setRegion(detected);
      clearError('region');
    }
  }

  function clearError(field: keyof SignupErrors) {
    setErrors(previous => ({ ...previous, [field]: undefined }));
    mutation.reset();
  }

  function notReady() {
    Alert.alert('준비 중', '아직 준비 중인 기능이에요.');
  }

  function submit() {
    const nextErrors = validateSignup({
      email,
      password,
      passwordConfirm,
      nickname,
      region,
      gender,
      agreeTerms,
      agreeAge,
    });
    setErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0 ||
      region === null ||
      gender === null
    ) {
      return;
    }

    mutation.mutate(
      {
        email: email.trim(),
        password,
        nickname: nickname.trim(),
        region,
        gender,
      },
      {
        onSuccess: () => setIsSignupComplete(true),
      },
    );
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
            <AppText style={styles.title}>회원가입</AppText>
            <AppText style={styles.subtitle}>
              <AppText style={styles.subtitleAccent}>GO!</AppText>와 함께 즐거운
              산책을 시작해봐요!
            </AppText>

            <AuthTextField
              label="이메일 주소"
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
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordConfirmRef.current?.focus()}
            />
            <AuthTextField
              ref={passwordConfirmRef}
              label="비밀번호 확인"
              leftIcon="lock-closed-outline"
              secureToggle
              value={passwordConfirm}
              placeholder="비밀번호 확인"
              onChangeText={text => {
                setPasswordConfirm(text);
                clearError('passwordConfirm');
              }}
              error={errors.passwordConfirm}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => nicknameRef.current?.focus()}
            />
            <AuthTextField
              ref={nicknameRef}
              label="닉네임"
              leftIcon="person-outline"
              showCount
              value={nickname}
              placeholder="닉네임"
              onChangeText={text => {
                setNickname(text);
                clearError('nickname');
              }}
              error={errors.nickname}
              autoCapitalize="none"
              maxLength={NICKNAME_MAX_LENGTH}
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            <View style={styles.section}>
              <View style={styles.regionHeader}>
                <AppText style={styles.sectionLabel}>지역</AppText>
                <Pressable
                  onPress={detectRegion}
                  disabled={detectionStatus === 'detecting'}
                  accessibilityRole="button"
                  accessibilityLabel="현재 위치로 지역 찾기"
                  accessibilityState={{
                    disabled: detectionStatus === 'detecting',
                  }}
                >
                  <AppText style={styles.detectButton}>
                    {detectionStatus === 'detecting'
                      ? '위치 확인 중…'
                      : '현재 위치로 찾기'}
                  </AppText>
                </Pressable>
              </View>
              <RegionDropdown
                selected={region}
                invalid={Boolean(errors.region)}
                onSelect={value => {
                  setRegion(value);
                  clearError('region');
                }}
              />
              {detectionStatus === 'denied' ? (
                <AppText style={styles.hint} accessibilityLiveRegion="polite">
                  위치 권한이 없어 지역을 직접 선택해 주세요.
                </AppText>
              ) : null}
              {detectionStatus === 'error' ? (
                <AppText style={styles.hint} accessibilityLiveRegion="polite">
                  위치를 가져오지 못했어요. 지역을 직접 선택해 주세요.
                </AppText>
              ) : null}
              {errors.region ? (
                <AppText style={styles.error} accessibilityLiveRegion="polite">
                  {errors.region}
                </AppText>
              ) : null}
            </View>

            <View style={styles.section}>
              <AppText style={styles.sectionLabel}>성별</AppText>
              <GenderSelector
                selected={gender}
                onSelect={value => {
                  setGender(value);
                  clearError('gender');
                }}
              />
              {errors.gender ? (
                <AppText style={styles.error} accessibilityLiveRegion="polite">
                  {errors.gender}
                </AppText>
              ) : null}
            </View>

            <View style={styles.consent}>
              <ConsentCheckboxes
                agreeTerms={agreeTerms}
                agreeAge={agreeAge}
                onToggleTerms={() => {
                  setAgreeTerms(previous => !previous);
                  clearError('agreeTerms');
                }}
                onToggleAge={() => {
                  setAgreeAge(previous => !previous);
                  clearError('agreeAge');
                }}
                onPressTerms={notReady}
                onPressPrivacy={notReady}
                termsError={errors.agreeTerms}
                ageError={errors.agreeAge}
              />
            </View>

            {mutation.error ? (
              <AppText style={styles.error} accessibilityLiveRegion="polite">
                {mutation.error.message}
              </AppText>
            ) : null}

            <AuthSubmitButton
              label="회원가입"
              onPress={submit}
              pending={mutation.isPending}
            />

            <Pressable
              style={styles.loginLink}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
            >
              <AppText style={styles.loginText}>
                이미 계정이 있으신가요?{' '}
                <AppText style={styles.loginAccent}>로그인</AppText>
              </AppText>
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <AppText style={styles.dividerText}>또는</AppText>
              <View style={styles.dividerLine} />
            </View>

            {social.errorMessage ? (
              <AppText style={styles.error} accessibilityLiveRegion="polite">
                {social.errorMessage}
              </AppText>
            ) : null}

            <SocialAuthButtons
              onKakaoPress={() => social.start('KAKAO')}
              onGooglePress={() => social.start('GOOGLE')}
              pendingProvider={social.pendingProvider}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SignupCompleteModal
        visible={isSignupComplete}
        onConfirm={() => {
          setIsSignupComplete(false);
          navigation.goBack();
        }}
      />
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
    // 본문 view의 상단 모서리를 깎고 사진 위로 끌어올려(-OVERLAP) 사진을 덮는다.
    marginTop: -BODY_OVERLAP + 8,
    borderTopLeftRadius: BODY_CORNER_RADIUS,
    borderTopRightRadius: BODY_CORNER_RADIUS,
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingTop: BODY_OVERLAP + 20,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: lineHeights[28],
    color: TITLE_COLOR,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 28,
    fontFamily: bodyFont.regular,
    fontSize: 15,
    color: SUBTITLE_COLOR,
    textAlign: 'center',
  },
  subtitleAccent: {
    fontFamily: bodyFont.bold,
    color: PRIMARY_COLOR,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    marginBottom: 8,
    fontFamily: bodyFont.medium,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: LABEL_COLOR,
  },
  regionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detectButton: {
    fontFamily: bodyFont.medium,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: ACCENT_COLOR,
  },
  hint: {
    marginTop: 8,
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: HINT_COLOR,
  },
  error: {
    marginTop: 4,
    marginBottom: 12,
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: ERROR_COLOR,
  },
  consent: {
    marginBottom: 20,
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    fontFamily: bodyFont.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: SUBTITLE_COLOR,
  },
  loginAccent: {
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
});
