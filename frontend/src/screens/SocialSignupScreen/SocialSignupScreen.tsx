import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { AuthSubmitButton } from '../../features/auth/components/AuthSubmitButton';
import { AuthTextField } from '../../features/auth/components/AuthTextField';
import { GenderSelector } from '../../features/auth/components/GenderSelector';
import type { Gender } from '../../features/auth/constants/genders';
import { SOCIAL_PROVIDER_LABELS } from '../../features/auth/constants/socialProviders';
import { useSocialSignupMutation } from '../../features/auth/hooks/useSocialSignupMutation';
import {
  NICKNAME_MAX_LENGTH,
  validateSocialSignup,
} from '../../features/auth/model/validation';
import type { SocialSignupErrors } from '../../features/auth/model/validation';
import { resolveApiErrorMessage } from '../../shared/api/resolveApiErrorMessage';
import { Screen } from '../../shared/components/Screen/Screen';
import { fontFamily } from '../../shared/constants/typography';
// 상단 픽셀아트 배너는 회원가입 화면의 히어로를 그대로 재활용한다.
import { SignupHero } from '../SignupScreen/components/SignupHero';

type SocialSignupScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'SocialSignup'
>;

const LABEL_COLOR = '#374151';
const ERROR_COLOR = '#DC2626';
const TITLE_COLOR = '#111827';
const SUBTITLE_COLOR = '#4B5563';
const PRIMARY_COLOR = '#27A34A';

// 본문 view가 사진을 덮는 오버랩 높이와 상단 라운드 반경. 회원가입과 동일 규격.
const BODY_OVERLAP = 24;
const BODY_CORNER_RADIUS = 24;

const SCREEN_EDGES = ['bottom'] as const;

/** 소셜 계정 이름을 닉네임 기본값으로 쓸 수 있게 다듬는다. */
function toInitialNickname(name: string | null) {
  return (name ?? '').trim().slice(0, NICKNAME_MAX_LENGTH);
}

/**
 * 소셜 계정으로 처음 로그인한 회원이 닉네임·성별을 정하는 화면. 제출이 성공하면
 * 세션이 시작되고 RootNavigator가 Main으로 넘긴다.
 */
export function SocialSignupScreen({
  navigation,
  route,
}: SocialSignupScreenProps) {
  const { provider, accountId, idToken, suggestedName } = route.params;

  const [nickname, setNickname] = useState(() =>
    toInitialNickname(suggestedName),
  );
  const [gender, setGender] = useState<Gender | null>(null);
  const [errors, setErrors] = useState<SocialSignupErrors>({});

  const mutation = useSocialSignupMutation();
  const providerLabel = SOCIAL_PROVIDER_LABELS[provider];

  function clearError(field: keyof SocialSignupErrors) {
    setErrors(previous => ({ ...previous, [field]: undefined }));
    mutation.reset();
  }

  function submit() {
    const nextErrors = validateSocialSignup({ nickname, gender });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || gender === null) {
      return;
    }

    // 성공 후 화면 전환은 RootNavigator가 맡는다. 토큰이 저장되면 인증 화면들이
    // 스택에서 빠지고 Main만 남는다.
    mutation.mutate({
      provider,
      accountId,
      idToken,
      nickname: nickname.trim(),
      gender,
    });
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
            <Text style={styles.title}>거의 다 왔어요!</Text>
            <Text style={styles.subtitle}>
              <Text style={styles.subtitleAccent}>{providerLabel}</Text> 계정으로
              시작할게요. 닉네임과 성별만 정해주세요.
            </Text>

            <AuthTextField
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

            {mutation.error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {resolveApiErrorMessage(mutation.error)}
              </Text>
            ) : null}

            <AuthSubmitButton
              label="가입 완료"
              onPress={submit}
              pending={mutation.isPending}
            />

            <Pressable
              style={styles.cancelLink}
              onPress={() => navigation.goBack()}
              disabled={mutation.isPending}
              accessibilityRole="button"
              accessibilityState={{ disabled: mutation.isPending }}
            >
              <Text style={styles.cancelText}>다른 방법으로 로그인</Text>
            </Pressable>
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
    marginTop: -BODY_OVERLAP + 8,
    borderTopLeftRadius: BODY_CORNER_RADIUS,
    borderTopRightRadius: BODY_CORNER_RADIUS,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: BODY_OVERLAP + 20,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 26,
    lineHeight: 34,
    color: TITLE_COLOR,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 28,
    fontSize: 15,
    lineHeight: 22,
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
  error: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
    color: ERROR_COLOR,
  },
  cancelLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    color: SUBTITLE_COLOR,
  },
});
