import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 개발 단계: 온보딩을 항상 노출하기 위해 완료 체크를 잠시 비활성화한다.
// TODO(온보딩 복구): 아래 useOnboardingStatus 게이트 주석을 해제할 것.
// import { useOnboardingStatus } from '../../shared/hooks/useOnboardingStatus';
import { LoginScreen } from '../../screens/LoginScreen/LoginScreen';
import { OnboardingScreen } from '../../screens/OnboardingScreen/OnboardingScreen';
import { PermissionsScreen } from '../../screens/PermissionsScreen/PermissionsScreen';
import { SignupScreen } from '../../screens/SignupScreen/SignupScreen';
import { MainTabNavigator } from './MainTabNavigator';

// 진입 순서: Onboarding -> Permissions -> Login -> Main.
// 각 단계는 reset으로 넘어가므로 앞 단계로 되돌아갈 수 없다.
export type RootStackParamList = {
  Onboarding: undefined;
  Permissions: undefined;
  Login: undefined;
  Signup: undefined;
  Main: undefined;
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
      {/* 헤더를 노출해 플랫폼 기본 뒤로가기 버튼을 사용한다. 권한 화면에서
          reset으로 진입하면 스택이 비어 있어 뒤로가기가 표시되지 않는다. */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: true, title: '로그인' }}
      />
      {/* 상단 픽셀아트 배너를 상태바까지 꽉 채우려고 헤더를 숨긴다. 뒤로가기는
          플랫폼 스와이프/하드웨어 back과 화면 하단의 '로그인' 링크로 대체한다. */}
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Main" component={MainTabNavigator} />
    </Stack.Navigator>
  );
}
