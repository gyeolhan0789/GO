import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { useAuth } from '../../features/auth/model/AuthContext';
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

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.description}>React Native 앱이 준비되었습니다.</Text>

        {isAuthenticated ? (
          <Text style={styles.authenticated}>로그인됨</Text>
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
});
