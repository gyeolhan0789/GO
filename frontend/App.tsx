import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProviders } from './src/app/providers/AppProviders';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { navigationRef } from './src/app/navigation/navigationRef';
import { WearCompanion } from './src/features/wear/components/WearCompanion';

function App() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        {/* 워치에서 온 명령이 화면을 옮길 수 있어야 해서 ref를 넘긴다. */}
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
        </NavigationContainer>
        {/* 그리는 게 없는 갤럭시 워치 동기화. 화면과 무관하게 계속 돌아야 해서
            네비게이터 밖에 둔다. */}
        <WearCompanion />
      </AppProviders>
    </SafeAreaProvider>
  );
}

export default App;
