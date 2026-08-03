import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './RootNavigator';

/** 컴포넌트 밖(알림 탭 이벤트, 워치에서 온 명령 등)에서 네비게이션을 트리거하기
 * 위한 ref. App.tsx의 NavigationContainer에 연결된다. 컴포넌트 트리 안에서는
 * useNavigation을 쓴다. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToWalkSession() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('WalkSession');
  }
}
