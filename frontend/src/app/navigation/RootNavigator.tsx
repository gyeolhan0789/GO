import { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { SocialProvider } from '../../features/auth/constants/socialProviders';
import { useAuth } from '../../features/auth/model/AuthContext';
import type { GameMode } from '../../features/room/api/roomApi';
import {
  hydrateWalkSessionFromNative,
  isWalkSessionActive,
} from '../../features/walk-session/model/walkSessionStore';
import { colors } from '../../shared/constants/colors';
import { fontFamily } from '../../shared/constants/typography';
import { useOnboardingStatus } from '../../shared/hooks/useOnboardingStatus';
import { usePermissionsStatus } from '../../shared/hooks/usePermissionsStatus';
import { navigateToWalkSession } from './navigationRef';
import { BingoBoardScreen } from '../../screens/BingoBoardScreen/BingoBoardScreen';
import { LoginScreen } from '../../screens/LoginScreen/LoginScreen';
import { OnboardingScreen } from '../../screens/OnboardingScreen/OnboardingScreen';
import { PermissionsScreen } from '../../screens/PermissionsScreen/PermissionsScreen';
import { CharacterCustomizeScreen } from '../../screens/CharacterCustomizeScreen/CharacterCustomizeScreen';
import { FriendRequestsScreen } from '../../screens/FriendRequestsScreen/FriendRequestsScreen';
import { MyPageScreen } from '../../screens/MyPageScreen/MyPageScreen';
import { SignupScreen } from '../../screens/SignupScreen/SignupScreen';
import { SocialSignupScreen } from '../../screens/SocialSignupScreen/SocialSignupScreen';
import { WalkDetailScreen } from '../../screens/WalkDetailScreen/WalkDetailScreen';
import { WalkListScreen } from '../../screens/WalkListScreen/WalkListScreen';
import { WalkResultScreen } from '../../screens/WalkResultScreen/WalkResultScreen';
import { WalkRoomDetailScreen } from '../../screens/WalkRoomDetailScreen/WalkRoomDetailScreen';
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
  /**
   * 소셜 계정으로 처음 로그인한 회원의 프로필 입력. `signupToken`은 검증
   * 단계에서 서버가 준 1회용 토큰이고 5분 뒤 만료된다.
   */
  SocialSignup: {
    provider: SocialProvider;
    signupToken: string;
    suggestedName: string | null;
  };
  Main: undefined;
  WalkList: undefined;
  // 방이 아니라 끝난 판 하나를 가리킨다. 같은 방에서 여러 판이 나온다.
  WalkDetail: { gameId: number };
  WalkRoomDetail: { roomId: number };
  // roomId는 화면 파라미터가 아니라 walkSessionStore(전역 진행 중인 세션
  // 상태)로 전달된다.
  WalkSession: undefined;
  // endWalkSession()이 스토어를 바로 비우므로, 방금 끝난 세션의 수치는
  // 화면 파라미터로 직접 들고 온다.
  WalkResult: {
    roomId: number;
    roomName: string;
    mode: GameMode;
    steps: number;
    distanceKm: number;
    calories: number;
    elapsedSeconds: number;
  };
  BingoBoard: { roomId: number };
  MyPage: undefined;
  CharacterCustomize: undefined;
  // 받은/보낸 친구 요청 내역. 보낸 요청은 서버가 아직 응답받지 않은 요청만 내려준다.
  FriendRequests: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** 탭 밖 화면들이 공유하는 헤더 모양. 제목만 화면마다 바꿔 쓴다. */
const DETAIL_HEADER_OPTIONS = {
  headerShown: true,
  headerTitleAlign: 'center',
  headerTitleStyle: { fontFamily: fontFamily.bold, fontSize: 18 },
  headerTintColor: colors.ink,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.surface },
} as const;

export function RootNavigator() {
  const { status } = useAuth();
  const onboarding = useOnboardingStatus();
  const permissions = usePermissionsStatus();

  // 네이티브 산책 세션(WalkForegroundService)의 현재 상태로 walkSessionStore
  // 캐시를 한 번 맞춘다 — 앱이 강제종료됐다 다시 켜졌을 때도 진행 중이던
  // 세션이 있으면 이걸로 알아낸다.
  const [isWalkHydrated, setWalkHydrated] = useState(false);
  useEffect(() => {
    hydrateWalkSessionFromNative().finally(() => setWalkHydrated(true));
  }, []);

  const isAuthenticated = status === 'authenticated';

  // 하이드레이션 결과 진행 중인 세션이 있으면 산책 화면으로 바로 이동한다.
  // 사용자가 끝내고 싶으면 그 화면의 기존 "산책 종료" 버튼을 쓰면 된다.
  useEffect(() => {
    if (isAuthenticated && isWalkHydrated && isWalkSessionActive()) {
      navigateToWalkSession();
    }
  }, [isAuthenticated, isWalkHydrated]);

  // 세션 복구나 게이트 조회가 끝나기 전에 화면을 고르면, 이미 온보딩을 끝낸
  // 사용자에게 온보딩이 한 프레임 깜빡인다. 다 읽을 때까지 그리지 않는다.
  if (
    status === 'restoring' ||
    onboarding.isLoading ||
    permissions.isLoading ||
    !isWalkHydrated
  ) {
    return null;
  }

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
          <Stack.Screen
            name="WalkRoomDetail"
            component={WalkRoomDetailScreen}
            options={{ ...DETAIL_HEADER_OPTIONS, title: '모임 상세' }}
          />
          {/* 진행 중 화면은 자체 상단바(나가기 버튼)를 쓰므로 네이티브 헤더를 끈다. */}
          <Stack.Screen name="WalkSession" component={WalkSessionScreen} />
          {/* 축하 화면 톤을 내려고 자체 레이아웃을 쓰므로 네이티브 헤더를 끈다. */}
          <Stack.Screen name="WalkResult" component={WalkResultScreen} />
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
          <Stack.Screen
            name="FriendRequests"
            component={FriendRequestsScreen}
            options={{ ...DETAIL_HEADER_OPTIONS, title: '친구 요청' }}
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
          {/* 로그인·회원가입 화면과 같은 배너를 쓰므로 헤더를 숨긴다. 뒤로가기는
              화면 하단의 '다른 방법으로 로그인' 링크로 대체한다. */}
          <Stack.Screen
            name="SocialSignup"
            component={SocialSignupScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
