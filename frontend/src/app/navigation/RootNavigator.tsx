import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../../features/auth/model/AuthContext';
import { colors } from '../../shared/constants/colors';
import { useOnboardingStatus } from '../../shared/hooks/useOnboardingStatus';
import { usePermissionsStatus } from '../../shared/hooks/usePermissionsStatus';
import { BingoBoardScreen } from '../../screens/BingoBoardScreen/BingoBoardScreen';
import { LoginScreen } from '../../screens/LoginScreen/LoginScreen';
import { OnboardingScreen } from '../../screens/OnboardingScreen/OnboardingScreen';
import { PermissionsScreen } from '../../screens/PermissionsScreen/PermissionsScreen';
import { CharacterCustomizeScreen } from '../../screens/CharacterCustomizeScreen/CharacterCustomizeScreen';
import { MyPageScreen } from '../../screens/MyPageScreen/MyPageScreen';
import { SignupScreen } from '../../screens/SignupScreen/SignupScreen';
import { WalkDetailScreen } from '../../screens/WalkDetailScreen/WalkDetailScreen';
import { WalkListScreen } from '../../screens/WalkListScreen/WalkListScreen';
import { WalkSessionScreen } from '../../screens/WalkSessionScreen/WalkSessionScreen';
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
  WalkList: undefined;
  WalkDetail: { roomId: number };
  // TODO: 방 생성/선택 API 연동되면 roomId를 필수 파라미터로 받는다.
  WalkSession: undefined;
  // TODO: roomId 연동되면 필수 파라미터로 받는다.
  BingoBoard: undefined;
  MyPage: undefined;
  CharacterCustomize: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** 탭 밖 화면들이 공유하는 헤더 모양. 제목만 화면마다 바꿔 쓴다. */
const DETAIL_HEADER_OPTIONS = {
  headerShown: true,
  headerTitleAlign: 'center',
  headerTitleStyle: { fontFamily: 'BMDOHYEON', fontSize: 18 },
  headerTintColor: colors.ink,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.surface },
} as const;

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
      // initialRouteName은 Navigator 최초 마운트에만 읽힌다. key로 분기를 갈라
      // 새로 마운트하지 않으면, 인증이 풀릴 때 첫 등록 화면(Onboarding)으로 간다.
      key={isAuthenticated ? 'authenticated' : 'unauthenticated'}
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          {/* 탭 밖 화면들은 뒤로가기가 필요하니 네이티브 헤더를 쓴다. */}
          <Stack.Screen
            name="WalkList"
            component={WalkListScreen}
            options={{ ...DETAIL_HEADER_OPTIONS, title: '전체 산책 기록' }}
          />
          <Stack.Screen
            name="WalkDetail"
            component={WalkDetailScreen}
            options={{ ...DETAIL_HEADER_OPTIONS, title: '산책 기록' }}
          />
          {/* 진행 중 화면은 자체 상단바(나가기 버튼)를 쓰므로 네이티브 헤더를 끈다. */}
          <Stack.Screen name="WalkSession" component={WalkSessionScreen} />
          {/* 보드/미션 상세 2단계를 자체 상단바로 전환하므로 네이티브 헤더를 끈다. */}
          <Stack.Screen name="BingoBoard" component={BingoBoardScreen} />
          <Stack.Screen
            name="MyPage"
            component={MyPageScreen}
            options={{ ...DETAIL_HEADER_OPTIONS, title: '프로필 설정' }}
          />
          <Stack.Screen
            name="CharacterCustomize"
            component={CharacterCustomizeScreen}
            options={{ ...DETAIL_HEADER_OPTIONS, title: '캐릭터 꾸미기' }}
          />
        </>
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
