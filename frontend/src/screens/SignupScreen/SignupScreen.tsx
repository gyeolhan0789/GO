import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import type { Gender } from '../../features/auth/constants/genders';
import type { Region } from '../../features/auth/constants/regions';
import { useRegionDetection } from '../../features/auth/hooks/useRegionDetection';
import { useSignupMutation } from '../../features/auth/hooks/useSignupMutation';
import {
  NICKNAME_MAX_LENGTH,
  validateSignup,
} from '../../features/auth/model/validation';
import type { SignupErrors } from '../../features/auth/model/validation';
import { Screen } from '../../shared/components/Screen/Screen';
import { fontFamily } from '../../shared/constants/typography';
import { SignupHero } from './components/SignupHero';

type SignupScreenProps = NativeStackScreenProps<RootStackParamList, 'Signup'>;

const LABEL_COLOR = '#374151';
const ERROR_COLOR = '#DC2626';
const ACCENT_COLOR = '#2C6A47';
const HINT_COLOR = '#6B7280';
const TITLE_COLOR = '#111827';
const SUBTITLE_COLOR = '#4B5563';
const PRIMARY_COLOR = '#27A34A';
const DIVIDER_COLOR = '#E5E7EB';

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

  const passwordRef = useRef<TextInput>(null);
  const passwordConfirmRef = useRef<TextInput>(null);
  const nicknameRef = useRef<TextInput>(null);
  const mutation = useSignupMutation();
  const {
    status: detectionStatus,
    detectIfPermitted,
    detect,
  } = useRegionDetection();

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
        onSuccess: () =>
          Alert.alert('회원가입 완료', '로그인해 주세요.', [
            { text: '확인', onPress: () => navigation.goBack() },
          ]),
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
            <Text style={styles.title}>회원가입</Text>
            <Text style={styles.subtitle}>
              <Text style={styles.subtitleAccent}>GO!</Text>와 함께 즐거운
              산책을 시작해봐요!
            </Text>

            <AuthTextField
              label="이메일 주소"
              leftIcon="person-outline"
              value={email}
              placeholder="이메일 주소"
              onChangeText={text => {
                setEmail(text);
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
                <Text style={styles.sectionLabel}>지역</Text>
                <Pressable
                  onPress={detectRegion}
                  disabled={detectionStatus === 'detecting'}
                  accessibilityRole="button"
                  accessibilityLabel="현재 위치로 지역 찾기"
                  accessibilityState={{
                    disabled: detectionStatus === 'detecting',
                  }}
                >
                  <Text style={styles.detectButton}>
                    {detectionStatus === 'detecting'
                      ? '위치 확인 중…'
                      : '현재 위치로 찾기'}
                  </Text>
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
                <Text style={styles.hint} accessibilityLiveRegion="polite">
                  위치 권한이 없어 지역을 직접 선택해 주세요.
                </Text>
              ) : null}
              {detectionStatus === 'error' ? (
                <Text style={styles.hint} accessibilityLiveRegion="polite">
                  위치를 가져오지 못했어요. 지역을 직접 선택해 주세요.
                </Text>
              ) : null}
              {errors.region ? (
                <Text style={styles.error} accessibilityLiveRegion="polite">
                  {errors.region}
                </Text>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>성별</Text>
              <GenderSelector
                selected={gender}
                onSelect={value => {
                  setGender(value);
                  clearError('gender');
                }}
              />
              {errors.gender ? (
                <Text style={styles.error} accessibilityLiveRegion="polite">
                  {errors.gender}
                </Text>
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
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {mutation.error.message}
              </Text>
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
              <Text style={styles.loginText}>
                이미 계정이 있으신가요?{' '}
                <Text style={styles.loginAccent}>로그인</Text>
              </Text>
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.dividerLine} />
            </View>

            <SocialAuthButtons
              onKakaoPress={notReady}
              onGooglePress={notReady}
            />
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
    backgroundColor: '#FFFFFF',
  },
  body: {
    // 본문 view의 상단 모서리를 깎고 사진 위로 끌어올려(-OVERLAP) 사진을 덮는다.
    marginTop: -BODY_OVERLAP,
    borderTopLeftRadius: BODY_CORNER_RADIUS,
    borderTopRightRadius: BODY_CORNER_RADIUS,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: BODY_OVERLAP + 20,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 36,
    color: TITLE_COLOR,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 28,
    fontSize: 15,
    color: SUBTITLE_COLOR,
    textAlign: 'center',
  },
  subtitleAccent: {
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: LABEL_COLOR,
  },
  regionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detectButton: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT_COLOR,
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    color: HINT_COLOR,
  },
  error: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
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
    fontSize: 14,
    color: SUBTITLE_COLOR,
  },
  loginAccent: {
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: DIVIDER_COLOR,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: HINT_COLOR,
  },
});
