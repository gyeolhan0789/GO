import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '../../shared/components/TabBarIcon/TabBarIcon';
import { RecordScreen } from '../../screens/RecordScreen/RecordScreen';
import { CompanionScreen } from '../../screens/CompanionScreen/CompanionScreen';
import { HomeScreen } from '../../screens/HomeScreen/HomeScreen';
import { RankingScreen } from '../../screens/RankingScreen/RankingScreen';
import { ShopScreen } from '../../screens/ShopScreen/ShopScreen';

export type MainTabParamList = {
  Record: undefined;
  Companion: undefined;
  Home: undefined;
  Ranking: undefined;
  Shop: undefined;
};

function createTabBarIcon(name: IoniconsIconName) {
  return function TabIcon({ focused }: { focused: boolean }) {
    return <TabBarIcon name={name} focused={focused} />;
  };
}

const RecordTabIcon = createTabBarIcon('bar-chart-outline');
const CompanionTabIcon = createTabBarIcon('people-outline');
const HomeTabIcon = createTabBarIcon('home-outline');
const RankingTabIcon = createTabBarIcon('trophy-outline');
const ShopTabIcon = createTabBarIcon('storefront-outline');

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_BAR_PADDING_TOP = 17;
// Icon box (see TabBarIcon) plus breathing room, excluding the device's
// bottom safe-area inset. react-navigation subtracts insets.bottom from a
// fixed `height` as paddingBottom, so a static height clips the icons on
// devices with a tall 3-button navigation bar.
const TAB_BAR_FIXED_CONTENT_HEIGHT = 83;

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          paddingTop: TAB_BAR_PADDING_TOP,
          height: TAB_BAR_FIXED_CONTENT_HEIGHT + insets.bottom,
        },
      }}
    >
      <Tab.Screen
        name="Record"
        component={RecordScreen}
        options={{ tabBarIcon: RecordTabIcon }}
      />
      <Tab.Screen
        name="Companion"
        component={CompanionScreen}
        options={{ tabBarIcon: CompanionTabIcon }}
      />
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: HomeTabIcon }}
      />
      <Tab.Screen
        name="Ranking"
        component={RankingScreen}
        options={{ tabBarIcon: RankingTabIcon }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopScreen}
        options={{ tabBarIcon: ShopTabIcon }}
      />
    </Tab.Navigator>
  );
}
