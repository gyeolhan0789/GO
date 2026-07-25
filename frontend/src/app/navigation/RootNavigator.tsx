import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 개발 단계: 온보딩을 항상 노출하기 위해 완료 체크를 잠시 비활성화한다.
// TODO(온보딩 복구): 아래 useOnboardingStatus 게이트 주석을 해제할 것.
// import { useOnboardingStatus } from '../../shared/hooks/useOnboardingStatus';
import { OnboardingScreen } from '../../screens/OnboardingScreen/OnboardingScreen';
import { PermissionsScreen } from '../../screens/PermissionsScreen/PermissionsScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { LoginScreen } from '../../screens/LoginScreen/LoginScreen';
import { SignupScreen } from '../../screens/SignupScreen/SignupScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Permissions: undefined;
  Main: undefined;
  Login: undefined;
  Signup: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  // 개발 단계: 온보딩 완료 여부와 무관하게 항상 Onboarding부터 시작한다.
  // TODO(온보딩 복구): 아래 게이트로 되돌릴 것.
  // const { isLoading, hasCompleted } = useOnboardingStatus();
  // if (isLoading) {
  //   return null;
  // }

  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
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
