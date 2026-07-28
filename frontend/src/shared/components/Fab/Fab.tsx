import { Pressable, StyleSheet } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons';

import { colors } from '../../constants/colors';

type FabProps = {
  onPress: () => void;
  icon?: IoniconsIconName;
};

export function Fab({ onPress, icon = 'add' }: FabProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={28} color={colors.surface} />
    </Pressable>
  );
}

const SIZE = 56;

const styles = StyleSheet.create({
  fab: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  pressed: {
    opacity: 0.85,
  },
});
