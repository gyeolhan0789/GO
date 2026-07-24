import { StyleSheet, View } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons';

type TabBarIconProps = {
  name: IoniconsIconName;
  focused: boolean;
};

const ICON_SIZE = 26;
const BOX_SIZE = 52;
const SHADOW_OFFSET = 4;

const ACTIVE_BACKGROUND_COLOR = '#E8F5E9';
const ACTIVE_ICON_COLOR = '#2C6A47';
const INACTIVE_ICON_COLOR = '#9CA3AF';
const BORDER_COLOR = '#111827';

export function TabBarIcon({ name, focused }: TabBarIconProps) {
  if (!focused) {
    return <Ionicons name={name} size={ICON_SIZE} color={INACTIVE_ICON_COLOR} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.shadowBox} />
      <View style={styles.activeBox}>
        <Ionicons name={name} size={ICON_SIZE} color={ACTIVE_ICON_COLOR} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: BOX_SIZE + SHADOW_OFFSET,
    height: BOX_SIZE + SHADOW_OFFSET,
  },
  shadowBox: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 16,
    backgroundColor: BORDER_COLOR,
  },
  activeBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    backgroundColor: ACTIVE_BACKGROUND_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
