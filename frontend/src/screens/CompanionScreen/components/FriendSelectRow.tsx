import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import type { FriendResponse } from '../../../features/friend/api/friendApi';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';

type FriendSelectRowProps = {
  friend: FriendResponse;
  selected: boolean;
  onPress: () => void;
};

export function FriendSelectRow({
  friend,
  selected,
  onPress,
}: FriendSelectRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${friend.nickname} 초대`}
    >
      {/* TODO: equippedItems로 캐릭터 아바타 구성. 지금은 빈 원으로 대체. */}
      <View style={styles.avatar} />

      <View style={styles.textGroup}>
        <Text style={styles.name} numberOfLines={1}>
          {friend.nickname}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          이번 주 {friend.weeklySteps}보
        </Text>
      </View>

      <View style={[styles.check, selected && styles.checkSelected]}>
        {selected ? (
          <Ionicons name="checkmark" size={14} color={colors.surface} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.neutralBg,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowSelected: {
    borderColor: colors.ink,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralBg,
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: 'BMDOHYEON',
    fontSize: 15,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: 'BMDOHYEON',
    fontSize: 12,
    color: colors.ink,
    opacity: 0.6,
    marginTop: 2,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.neutralBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
});
