import { useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { AuthSubmitButton } from '../../features/auth/components/AuthSubmitButton';
import { useLogoutMutation } from '../../features/auth/hooks/useLogoutMutation';
import { useAuth } from '../../features/auth/model/AuthContext';
import { ApiError } from '../../shared/api/ApiError';
import { Screen } from '../../shared/components/Screen/Screen';

const TITLE_COLOR = '#111827';
const DESCRIPTION_COLOR = '#6b7280';
const BUTTON_BACKGROUND_COLOR = '#2C6A47';
const BUTTON_LABEL_COLOR = '#FFFFFF';
const AUTHENTICATED_COLOR = '#2C6A47';

const PRESSED_OPACITY = 0.8;

// 어느 쪽이든 로그아웃은 끝났으므로 그 사실을 먼저 알린다.
const LOGOUT_ALERT_TITLE = '로그아웃했어요';
const SESSION_ALREADY_GONE_MESSAGE = '세션이 이미 만료되어 있었어요.';
const SERVER_UNREACHABLE_MESSAGE =
  '네트워크에 연결되지 않아 서버에는 반영되지 못했어요.';

export function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useAuth();
  const logout = useLogoutMutation();
  const isLoggingOut = useRef(false);

  // 세션을 정리하면 이 화면이 로그인 화면으로 교체되므로 화면 안 문구로는 알릴 수
  // 없다. catch에서 Alert를 띄우면 react-query 콜백 순서에 기대지 않아도 된다.
  async function requestLogout() {
    // pending 반영에 한 프레임이 걸려, 그 사이의 두 번째 탭은 동기 플래그로 막는다.
    if (isLoggingOut.current) {
      return;
    }
    isLoggingOut.current = true;

    try {
      await logout.mutateAsync();
    } catch (error) {
      Alert.alert(
        LOGOUT_ALERT_TITLE,
        error instanceof ApiError
          ? SESSION_ALREADY_GONE_MESSAGE
          : SERVER_UNREACHABLE_MESSAGE,
      );
    } finally {
      isLoggingOut.current = false;
    }
  }

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.description}>React Native 앱이 준비되었습니다.</Text>

        {isAuthenticated ? (
          <>
            <Text style={styles.authenticated}>로그인됨</Text>
            {/* 임시 배치. 마이페이지가 생기면 그쪽으로 옮긴다. */}
            <View style={styles.logout}>
              <AuthSubmitButton
                label="로그아웃"
                onPress={requestLogout}
                pending={logout.isPending}
              />
            </View>
          </>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed ? styles.buttonPressed : null,
            ]}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            accessibilityLabel="로그인">
            <Text style={styles.buttonLabel}>로그인</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: TITLE_COLOR,
  },
  description: {
    marginTop: 8,
    fontSize: 16,
    color: DESCRIPTION_COLOR,
  },
  button: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: BUTTON_BACKGROUND_COLOR,
  },
  buttonPressed: {
    opacity: PRESSED_OPACITY,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: BUTTON_LABEL_COLOR,
  },
  authenticated: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: '700',
    color: AUTHENTICATED_COLOR,
  },
  logout: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
});
