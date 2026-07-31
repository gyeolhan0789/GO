import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { PointBadge } from '../../../features/member/components/PointBadge';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';

type HomeHeaderProps = {
  points: number;
  /** 프로필 사진을 누르면 마이페이지로 간다. */
  onProfilePress: () => void;
};

export function HomeHeader({ points, onProfilePress }: HomeHeaderProps) {
  return (
    <View style={styles.container}>
      <PointBadge points={points} />
      <View style={styles.actions}>
        <Ionicons name="notifications-outline" size={24} color={colors.ink} />
        <Pressable
          onPress={onProfilePress}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="프로필 설정"
        >
          <Ionicons name="person" size={20} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
