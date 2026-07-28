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

// 어느 쪽이든 이 기기에서는 로그아웃이 끝났으므로 그 사실을 먼저 알린다. 남은
// 차이는 서버가 그걸 알았는지 여부뿐이다.
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

  // 실패해도 세션은 정리되어 이 화면이 로그인 화면으로 교체된다. 화면 안에 문구를
  // 띄우면 함께 사라지므로, 화면 밖에 남는 Alert로 알린다.
  //
  // Alert를 mutate의 onError가 아니라 mutateAsync의 catch에서 띄운다. onError는
  // onSettled(세션 정리)보다 먼저 돈다는 react-query 내부 순서에 기대야 하는데,
  // catch는 옵저버가 아닌 평범한 프로미스 연속이라 순서와 언마운트에 무관하다.
  async function requestLogout() {
    // pending으로 버튼을 비활성화해도 상태가 반영되기까지 한 프레임이 걸린다. 그
    // 사이의 두 번째 탭까지 막으려면 동기적으로 읽고 쓰는 플래그가 필요하다.
    if (isLoggingOut.current) {
      return;
    }
    isLoggingOut.current = true;

    try {
      await logout.mutateAsync();
    } catch (error) {
      // 서버가 거절했다는 건 토큰이 이미 못 쓰는 상태였다는 뜻이라, 사용자가 원한
      // 결과와 다르지 않다. 서버에 닿지 못한 경우만 따로 알린다 — 이때는 서버 쪽
      // 세션이 만료 전까지 남는다.
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
