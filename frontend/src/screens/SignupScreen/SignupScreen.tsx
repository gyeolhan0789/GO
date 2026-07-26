import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { RegionChipList } from '../../features/auth/components/RegionChipList';
import type { Region } from '../../features/auth/constants/regions';
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

const SCREEN_EDGES = ['bottom'] as const;

export function SignupScreen({ navigation }: SignupScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [region, setRegion] = useState<Region | null>(null);
  const [errors, setErrors] = useState<SignupErrors>({});

  const passwordRef = useRef<TextInput>(null);
  const nicknameRef = useRef<TextInput>(null);
  const mutation = useSignupMutation();

  function clearError(field: keyof SignupErrors) {
    setErrors(previous => ({ ...previous, [field]: undefined }));
    mutation.reset();
  }

  function submit() {
    const nextErrors = validateSignup({ email, password, nickname, region });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || region === null) {
      return;
    }

    mutation.mutate(
      {
        email: email.trim(),
        password,
        nickname: nickname.trim(),
        region,
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
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

          <View style={styles.regionSection}>
            <Text style={styles.regionLabel}>지역</Text>
            <RegionChipList
              selected={region}
              onSelect={value => {
                setRegion(value);
                clearError('region');
              }}
            />
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
  regionSection: {
    marginBottom: 24,
  },
  regionLabel: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: LABEL_COLOR,
  },
  error: {
    marginBottom: 12,
    fontSize: 13,
    color: ERROR_COLOR,
  },
});
