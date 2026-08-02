import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './RootNavigator';

/**
 * 화면 밖(워치에서 온 명령 등)에서 화면을 옮겨야 할 때 쓰는 참조.
 *
 * 컴포넌트 트리 안에서는 useNavigation을 쓴다. 이건 네이티브 이벤트처럼
 * 어느 화면에도 속하지 않은 곳에서 들어오는 흐름 전용이다.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
