import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { AuthSubmitButton } from '../../features/auth/components/AuthSubmitButton';
import { AuthTextField } from '../../features/auth/components/AuthTextField';
import { GenderSelector } from '../../features/auth/components/GenderSelector';
import { RegionDropdown } from '../../features/auth/components/RegionDropdown';
import type { Gender } from '../../features/auth/constants/genders';
import type { Region } from '../../features/auth/constants/regions';
import { SOCIAL_PROVIDER_LABELS } from '../../features/auth/constants/socialProviders';
import { useRegionDetection } from '../../features/auth/hooks/useRegionDetection';
import { useSocialSignupMutation } from '../../features/auth/hooks/useSocialSignupMutation';
import {
  NICKNAME_MAX_LENGTH,
  validateSocialSignup,
} from '../../features/auth/model/validation';
import type { SocialSignupErrors } from '../../features/auth/model/validation';
import { resolveApiErrorMessage } from '../../shared/api/resolveApiErrorMessage';
import { AppText } from '../../shared/components/AppText/AppText';
import { Screen } from '../../shared/components/Screen/Screen';
import { colors } from '../../shared/constants/colors';
import {
  bodyFont,
  fontFamily,
  lineHeights,
} from '../../shared/constants/typography';
// 상단 픽셀아트 배너는 회원가입 화면의 히어로를 그대로 재활용한다.
import { SignupHero } from '../SignupScreen/components/SignupHero';

type SocialSignupScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'SocialSignup'
>;

const LABEL_COLOR = colors.inkSoft;
const ERROR_COLOR = colors.danger;
const ACCENT_COLOR = colors.primaryDark;
const HINT_COLOR = colors.mutedStrong;
const TITLE_COLOR = colors.ink;
const SUBTITLE_COLOR = colors.inkMuted;
const PRIMARY_COLOR = colors.primary;

// 본문 view가 사진을 덮는 오버랩 높이와 상단 라운드 반경. 회원가입과 동일 규격.
const BODY_OVERLAP = 24;
const BODY_CORNER_RADIUS = 24;

const SCREEN_EDGES = ['bottom'] as const;

/** 소셜 계정 이름을 닉네임 기본값으로 쓸 수 있게 다듬는다. */
function toInitialNickname(name: string | null) {
  return (name ?? '').trim().slice(0, NICKNAME_MAX_LENGTH);
}

/**
 * 소셜 계정으로 처음 로그인한 회원이 프로필(닉네임·지역·성별)을 정하는 화면. 제출이 성공하면
 * 세션이 시작되고 RootNavigator가 Main으로 넘긴다.
 */
export function SocialSignupScreen({
  navigation,
  route,
}: SocialSignupScreenProps) {
  const { provider, signupToken, suggestedName } = route.params;

  const [nickname, setNickname] = useState(() =>
    toInitialNickname(suggestedName),
  );
  const [region, setRegion] = useState<Region | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [errors, setErrors] = useState<SocialSignupErrors>({});

  const mutation = useSocialSignupMutation();
  const providerLabel = SOCIAL_PROVIDER_LABELS[provider];
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

  function clearError(field: keyof SocialSignupErrors) {
    setErrors(previous => ({ ...previous, [field]: undefined }));
    mutation.reset();
  }

  function submit() {
    const nextErrors = validateSocialSignup({ nickname, region, gender });
    setErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0 ||
      region === null ||
      gender === null
    ) {
      return;
    }

    // 성공 후 화면 전환은 RootNavigator가 맡는다. 토큰이 저장되면 인증 화면들이
    // 스택에서 빠지고 Main만 남는다.
    mutation.mutate({
      provider,
      signupToken,
      nickname: nickname.trim(),
      region,
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
            <AppText style={styles.title}>거의 다 왔어요!</AppText>
            <AppText style={styles.subtitle}>
              <AppText style={styles.subtitleAccent}>{providerLabel}</AppText> 계정으로
              시작할게요. 프로필만 정해주세요.
            </AppText>

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

            {mutation.error ? (
              <AppText style={styles.error} accessibilityLiveRegion="polite">
                {resolveApiErrorMessage(mutation.error)}
              </AppText>
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
              <AppText style={styles.cancelText}>다른 방법으로 로그인</AppText>
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
  cancelLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: bodyFont.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: SUBTITLE_COLOR,
  },
});
