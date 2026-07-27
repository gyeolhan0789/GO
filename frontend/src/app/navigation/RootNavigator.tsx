import { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../../features/auth/model/AuthContext';
// 개발 단계: 온보딩을 항상 노출하기 위해 완료 체크를 잠시 비활성화한다.
// TODO(온보딩 복구): 아래 useOnboardingStatus 게이트 주석을 해제할 것.
// import { useOnboardingStatus } from '../../shared/hooks/useOnboardingStatus';
import { LoginScreen } from '../../screens/LoginScreen/LoginScreen';
import { OnboardingScreen } from '../../screens/OnboardingScreen/OnboardingScreen';
import { PermissionsScreen } from '../../screens/PermissionsScreen/PermissionsScreen';
import { SignupScreen } from '../../screens/SignupScreen/SignupScreen';
import { MainTabNavigator } from './MainTabNavigator';

// 진입 순서: Onboarding -> Permissions -> Login -> Main.
// 인증 화면들과 Main은 로그인 상태에 따라 배타적으로 등록되므로, 로그인하면
// 인증 화면이 스택에서 사라지고 세션이 끊기면 Main이 사라진다.
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
  const { status } = useAuth();

  // 이번 실행에서 로그인 상태였던 적이 있는지. refreshToken까지 만료돼 인증
  // 화면으로 되돌아갈 때는 온보딩부터 다시 보여줄 이유가 없으므로 로그인 화면으로
  // 보낸다.
  const [hadSession, setHadSession] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      setHadSession(true);
    }
  }, [status]);

  // 세션 복구가 끝나기 전에 화면을 고르면 이미 로그인한 사용자에게 온보딩이
  // 한 프레임 깜빡인다. 복구 중에는 아무것도 그리지 않는다.
  if (status === 'restoring') {
    return null;
  }

  const isAuthenticated = status === 'authenticated';

  // Navigator에 등록되지 않은 이름을 넘기면 react-navigation이 에러를 던진다.
  // 분기마다 실제로 등록된 화면 중에서만 고른다.
  const initialRouteName = isAuthenticated
    ? 'Main'
    : hadSession
    ? 'Login'
    : 'Onboarding';

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Permissions" component={PermissionsScreen} />
          {/* 상단 픽셀아트 배너를 상태바까지 꽉 채우려고 헤더를 숨긴다. 로그인은
              주로 reset으로 진입해(스택이 비어 있어) 뒤로가기가 필요 없다. */}
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          {/* 상단 픽셀아트 배너를 상태바까지 꽉 채우려고 헤더를 숨긴다. 뒤로가기는
              플랫폼 스와이프/하드웨어 back과 화면 하단의 '로그인' 링크로 대체한다. */}
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
