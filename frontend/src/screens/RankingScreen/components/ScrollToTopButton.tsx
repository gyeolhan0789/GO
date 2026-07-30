import { Pressable, StyleSheet } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';

type ScrollToTopButtonProps = {
  onPress: () => void;
};

const SIZE = 48;
const ICON_SIZE = 24;

/** 보일지 말지는 스크롤 위치를 아는 화면이 정한다. 여기서는 눌리는 것만 맡는다. */
export function ScrollToTopButton({ onPress }: ScrollToTopButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="맨 위로"
      hitSlop={8}
    >
      <Ionicons name="chevron-up" size={ICON_SIZE} color={colors.surface} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.85,
  },
});
