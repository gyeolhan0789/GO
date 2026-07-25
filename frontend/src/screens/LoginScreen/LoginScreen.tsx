import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import type { TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { AuthSubmitButton } from '../../features/auth/components/AuthSubmitButton';
import { AuthTextField } from '../../features/auth/components/AuthTextField';
import { useLoginMutation } from '../../features/auth/hooks/useLoginMutation';
import { validateLogin } from '../../features/auth/model/validation';
import type { LoginErrors } from '../../features/auth/model/validation';
import { Screen } from '../../shared/components/Screen/Screen';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

const ERROR_COLOR = '#DC2626';
const LINK_COLOR = '#2C6A47';

const SCREEN_EDGES = ['bottom'] as const;

export function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});

  const passwordRef = useRef<TextInput>(null);
  const mutation = useLoginMutation();

  function clearError(field: keyof LoginErrors) {
    setErrors(previous => ({ ...previous, [field]: undefined }));
    mutation.reset();
  }

  function submit() {
    const nextErrors = validateLogin({ email, password });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    mutation.mutate(
      { email: email.trim(), password },
      // 권한 화면에서 reset으로 진입하면 스택에 Main이 없다. 홈에서 들어온
      // 경우까지 한 가지로 처리하려고 popTo 대신 reset을 쓴다.
      {
        onSuccess: () =>
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] }),
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
            autoComplete="password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={submit}
          />

          {mutation.error ? (
            <Text style={styles.serverError} accessibilityLiveRegion="polite">
              {mutation.error.message}
            </Text>
          ) : null}

          <AuthSubmitButton
            label="로그인"
            onPress={submit}
            pending={mutation.isPending}
          />

          <Pressable
            style={styles.link}
            onPress={() => navigation.navigate('Signup')}
            accessibilityRole="button">
            <Text style={styles.linkText}>계정이 없으신가요? 회원가입</Text>
          </Pressable>
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
  serverError: {
    marginBottom: 12,
    fontSize: 14,
    color: ERROR_COLOR,
  },
  link: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: LINK_COLOR,
  },
});
