import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProviders } from './src/app/providers/AppProviders';
import { navigateToWalkSession, navigationRef } from './src/app/navigation/navigationRef';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { subscribeWalkTrackingOpenSession } from './src/shared/lib/walkTracking';

function App() {
  // 앱이 이미 떠있는 상태에서 산책 알림을 탭했을 때(MainActivity.onNewIntent)
  // 산책 화면으로 이동한다. 앱이 완전히 꺼졌다 켜지는 콜드스타트 복구는
  // RootNavigator의 네이티브 스냅샷 하이드레이션이 별도로 처리한다.
  useEffect(() => subscribeWalkTrackingOpenSession(navigateToWalkSession), []);

  return (
    <SafeAreaProvider>
      <AppProviders>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
        </NavigationContainer>
      </AppProviders>
    </SafeAreaProvider>
  );
}

export default App;
