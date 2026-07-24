import type { RootStackParamList } from './src/app/navigation/RootNavigator';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
