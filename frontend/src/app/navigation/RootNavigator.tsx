import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MainTabNavigator } from './MainTabNavigator';
import { LoginScreen } from '../../screens/LoginScreen/LoginScreen';
import { SignupScreen } from '../../screens/SignupScreen/SignupScreen';

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Signup: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabNavigator} />
      {/* 헤더를 노출해 플랫폼 기본 뒤로가기 버튼을 사용한다. */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: true, title: '로그인' }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ headerShown: true, title: '회원가입' }}
      />
    </Stack.Navigator>
  );
}
