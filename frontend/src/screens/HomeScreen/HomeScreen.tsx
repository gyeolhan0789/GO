import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { AuthSubmitButton } from '../../features/auth/components/AuthSubmitButton';
import { useLogoutMutation } from '../../features/auth/hooks/useLogoutMutation';
import { useAuth } from '../../features/auth/model/AuthContext';
import { resolveApiErrorMessage } from '../../shared/api/resolveApiErrorMessage';
import { Screen } from '../../shared/components/Screen/Screen';

const TITLE_COLOR = '#111827';
const DESCRIPTION_COLOR = '#6b7280';
const BUTTON_BACKGROUND_COLOR = '#2C6A47';
const BUTTON_LABEL_COLOR = '#FFFFFF';
const AUTHENTICATED_COLOR = '#2C6A47';

const PRESSED_OPACITY = 0.8;

export function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useAuth();
  const logout = useLogoutMutation();

  // 실패해도 세션은 정리되어 이 화면이 로그인 화면으로 교체된다. 화면 안에 문구를
  // 띄우면 함께 사라지므로, 화면 밖에 남는 Alert로 알린다.
  function requestLogout() {
    logout.mutate(undefined, {
      onError: error => {
        Alert.alert(
          '로그아웃',
          `${resolveApiErrorMessage(
            error,
          )}\n이 기기의 로그인 정보는 정리했어요.`,
        );
      },
    });
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
