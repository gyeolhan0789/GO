import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AppText } from '../../../shared/components/AppText/AppText';
import { AvatarStack } from '../../../shared/components/AvatarStack/AvatarStack';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../../shared/constants/typography';
import type { WalkRoomOption } from '../types';

type WalkRoomOptionRowProps = {
  option: WalkRoomOption;
  selected: boolean;
  onPress: () => void;
};

export function WalkRoomOptionRow({
  option,
  selected,
  onPress,
}: WalkRoomOptionRowProps) {
  const subtitle =
    option.mode === 'group'
      ? `이번 주 빙고 ${option.bingoCompleted}/${option.bingoTotal} · 멤버 ${option.memberCount}명`
      : `이번 주 빙고 ${option.bingoCompleted}/${option.bingoTotal}`;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      {option.mode === 'group' ? (
        <AvatarStack
          members={Array.from(
            { length: option.memberCount ?? 1 },
            (_, index) => ({ id: `${option.id}-${index}` }),
          )}
          size={40}
        />
      ) : (
        <View style={styles.soloIcon}>
          <Ionicons name="walk" size={20} color={colors.successText} />
        </View>
      )}

      <View style={styles.textGroup}>
        <AppText style={styles.title}>{option.name}</AppText>
        <AppText style={styles.subtitle}>{subtitle}</AppText>
      </View>

      <View style={[styles.radio, selected && styles.radioSelected]}>
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
  soloIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textGroup: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.neutralBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
});
