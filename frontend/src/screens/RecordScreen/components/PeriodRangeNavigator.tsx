import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';

type PeriodRangeNavigatorProps = {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  /** 오늘이 든 구간에서는 더 앞으로 갈 수 없다. */
  isNextDisabled: boolean;
  /** 누르면 구간을 직접 고른다. */
  onPressLabel: () => void;
};

const CHEVRON_SIZE = 16;

export function PeriodRangeNavigator({
  label,
  onPrev,
  onNext,
  isNextDisabled,
  onPressLabel,
}: PeriodRangeNavigatorProps) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPrev}
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
        hitSlop={spacing.sm}
        accessibilityRole="button"
        accessibilityLabel="이전 구간"
      >
        <Ionicons
          name="chevron-back"
          size={CHEVRON_SIZE}
          color={colors.ink}
        />
      </Pressable>

      {/* 화살표는 한 칸씩, 라벨은 먼 구간으로 한 번에 뛴다. */}
      <Pressable
        onPress={onPressLabel}
        style={({ pressed }) => [styles.labelButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`구간 선택, 현재 ${label}`}
      >
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>

      <Pressable
        onPress={onNext}
        disabled={isNextDisabled}
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
        hitSlop={spacing.sm}
        accessibilityRole="button"
        accessibilityLabel="다음 구간"
        accessibilityState={{ disabled: isNextDisabled }}
      >
        <Ionicons
          name="chevron-forward"
          size={CHEVRON_SIZE}
          color={isNextDisabled ? colors.muted : colors.ink}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    height: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  arrow: {
    paddingHorizontal: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  labelButton: {
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // 손가락이 닿도록 눌리는 영역을 넓힌다.
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  label: {
    fontFamily: 'BMDOHYEON',
    fontSize: 13,
    color: colors.ink,
  },
});
