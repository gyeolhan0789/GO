import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../../features/auth/model/AuthContext';
import { useOnboardingStatus } from '../../shared/hooks/useOnboardingStatus';
import { usePermissionsStatus } from '../../shared/hooks/usePermissionsStatus';
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
  const { status } = useAuth();
  const onboarding = useOnboardingStatus();
  const permissions = usePermissionsStatus();

  // 세션 복구나 게이트 조회가 끝나기 전에 화면을 고르면, 이미 온보딩을 끝낸
  // 사용자에게 온보딩이 한 프레임 깜빡인다. 다 읽을 때까지 그리지 않는다.
  if (status === 'restoring' || onboarding.isLoading || permissions.isLoading) {
    return null;
  }

  const isAuthenticated = status === 'authenticated';

  // 앱을 켰을 때 어디서 시작할지. 로그인 상태가 가장 우선이고, 그다음 온보딩,
  // 권한 순으로 통과하지 못한 첫 관문에서 시작한다.
  //
  //   토큰 있음                       -> Main
  //   온보딩 안 봄                    -> Onboarding -> Permissions -> Login
  //   온보딩 봤고 권한 미완료/회수     -> Permissions -> Login
  //   온보딩·권한 통과, 토큰 없음      -> Login
  //
  // 로그아웃이나 세션 만료로 인증이 풀린 경우도 같은 규칙으로 Login에 도달한다
  // (온보딩·권한은 이미 통과 상태라 건너뛴다). Navigator에 등록되지 않은 이름을
  // 넘기면 에러가 나므로 분기마다 실제로 등록된 화면 중에서만 고른다.
  const initialRouteName: keyof RootStackParamList = isAuthenticated
    ? 'Main'
    : !onboarding.hasCompleted
    ? 'Onboarding'
    : !permissions.isSatisfied
    ? 'Permissions'
    : 'Login';

  return (
    <Stack.Navigator
      // `initialRouteName`은 Navigator를 처음 마운트할 때 한 번만 읽힌다
      // (react-navigation이 router를 최초 1회만 만든다). 그래서 로그인 상태가
      // 뒤집혀 등록 화면이 통째로 바뀌어도 갱신되지 않는다. 로그인 상태로 앱을
      // 켰다면 router가 쥔 이름은 'Main'인데 로그아웃 시점에 그 화면은 이미
      // 사라졌으므로, react-navigation은 첫 번째로 등록된 화면(Onboarding)으로
      // 되돌린다. 분기마다 key를 갈라 Navigator를 새로 마운트해, 방금 계산한
      // 진입 화면이 실제로 쓰이게 한다.
      key={isAuthenticated ? 'authenticated' : 'unauthenticated'}
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
