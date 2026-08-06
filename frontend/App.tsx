import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProviders } from './src/app/providers/AppProviders';
import { navigateToWalkSession, navigationRef } from './src/app/navigation/navigationRef';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { WearCompanion } from './src/features/wear/components/WearCompanion';
import { DailyStepSync } from './src/features/history/components/DailyStepSync';
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
        {/* 알림 탭과 워치에서 온 명령이 화면을 옮길 수 있어야 해서 ref를 넘긴다. */}
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
        </NavigationContainer>
        {/* 그리는 게 없는 갤럭시 워치 동기화. 화면과 무관하게 계속 돌아야 해서
            네비게이터 밖에 둔다. */}
        <WearCompanion />
        {/* 걸음 원장 갱신과 지난 날짜 활동 기록 전송. 역시 그리는 게 없다. */}
        <DailyStepSync />
      </AppProviders>
    </SafeAreaProvider>
  );
}

export default App;
