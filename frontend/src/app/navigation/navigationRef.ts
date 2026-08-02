import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './RootNavigator';

/** 컴포넌트 밖(알림 탭 이벤트 구독 등)에서 네비게이션을 트리거하기 위한 ref.
 * App.tsx의 NavigationContainer에 연결된다. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToWalkSession() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('WalkSession');
  }
}
