import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AppText } from '../../../shared/components/AppText/AppText';
import { controlHeight } from '../../../shared/constants/sizing';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

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
        <Ionicons name="chevron-back" size={CHEVRON_SIZE} color={colors.ink} />
      </Pressable>

      {/* 화살표는 한 칸씩, 라벨은 먼 구간으로 한 번에 뛴다. */}
      <Pressable
        onPress={onPressLabel}
        style={({ pressed }) => [styles.labelButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`구간 선택, 현재 ${label}`}
      >
        <AppText style={styles.label} numberOfLines={1}>
          {label}
        </AppText>
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
    height: controlHeight.compact,
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
    paddingHorizontal: spacing.xs,
    // 손가락이 닿도록 눌리는 영역을 세로로 꽉 채운다. paddingVertical로 넓히면
    // 라벨 상자가 18(lineHeight) + 16이 되어, 테두리 2를 뺀 컨테이너 안쪽
    // 높이 32를 넘겨 글자가 밀려 보인다. 늘리는 건 부모 높이까지만.
    alignSelf: 'stretch',
  },
  label: {
    fontFamily: bodyFont.bold,
    fontSize: 13,
    color: colors.ink,
    lineHeight: lineHeights[13],
  },
});
