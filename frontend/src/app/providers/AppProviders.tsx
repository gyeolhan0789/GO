import { useEffect, type PropsWithChildren } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '../../features/auth/model/AuthContext';
import { FcmNotificationManager } from '../../features/notification/components/FcmNotificationManager';

const queryClient = new QueryClient();

// RN에는 브라우저의 window focus가 없어 react-query가 기본으로 아는 "포커스"
// 개념이 없다. AppState를 직접 연결해줘야, 앱을 백그라운드에서 다시 열 때
// refetchOnWindowFocus(기본 true)가 걸음수 같은 쿼리를 실제로 갱신해준다.
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FcmNotificationManager />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
