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
import { GenderSelector } from '../../features/auth/components/GenderSelector';
import { RegionDropdown } from '../../features/auth/components/RegionDropdown';
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

type SignupScreenProps = NativeStackScreenProps<RootStackParamList, 'Signup'>;

const LABEL_COLOR = '#374151';
const ERROR_COLOR = '#DC2626';
const ACCENT_COLOR = '#2C6A47';
const HINT_COLOR = '#6B7280';

const SCREEN_EDGES = ['bottom'] as const;

export function SignupScreen({ navigation }: SignupScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [region, setRegion] = useState<Region | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [errors, setErrors] = useState<SignupErrors>({});

  const passwordRef = useRef<TextInput>(null);
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

  function submit() {
    const nextErrors = validateSignup({
      email,
      password,
      nickname,
      region,
      gender,
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
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <AuthTextField
            label="이메일"
            value={email}
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
            value={password}
            onChangeText={text => {
              setPassword(text);
              clearError('password');
            }}
            error={errors.password}
            secureTextEntry
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
            value={nickname}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  section: {
    marginBottom: 24,
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
    marginBottom: 12,
    fontSize: 13,
    color: ERROR_COLOR,
  },
});
