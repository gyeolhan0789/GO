import { Pressable, StyleSheet, View } from 'react-native';

import { eachWeekStartInMonth } from '../../../../features/history/model/calendar';
import {
  formatPeriodLabel,
  resolvePeriodRange,
} from '../../../../features/history/model/period';
import { AppText } from '../../../../shared/components/AppText/AppText';
import { controlHeight } from '../../../../shared/constants/sizing';
import { colors } from '../../../../shared/constants/colors';
import { radius } from '../../../../shared/constants/radius';
import { spacing } from '../../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../../shared/constants/typography';

type WeekListProps = {
  /** 보고 있는 달. 그 달 1일의 'yyyy-MM-dd'. */
  visibleMonth: string;
  /** 선택된 기준일. 이 날이 든 주가 선택 상태가 된다. */
  selectedDate: string;
  /** 이 날짜 뒤로 시작하는 주는 고를 수 없다. */
  maxDate: string;
  onSelect: (weekStart: string) => void;
};

/** 주는 달 경계를 넘나들어서(6.29~7.5) 날짜 격자보다 구간 목록이 읽기 쉽다. */
export function WeekList({
  visibleMonth,
  selectedDate,
  maxDate,
  onSelect,
}: WeekListProps) {
  const selectedWeekStart = resolvePeriodRange('WEEK', selectedDate).startDate;

  return (
    <View style={styles.list}>
      {eachWeekStartInMonth(visibleMonth).map(weekStart => {
        const range = resolvePeriodRange('WEEK', weekStart);
        const isSelected = weekStart === selectedWeekStart;
        const disabled = range.startDate > maxDate;

        return (
          <Pressable
            key={weekStart}
            onPress={() => onSelect(weekStart)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.week,
              isSelected && styles.weekSelected,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={formatPeriodLabel('WEEK', range)}
            accessibilityState={{ selected: isSelected, disabled }}
          >
            <AppText
              style={[
                styles.weekLabel,
                isSelected && styles.weekLabelSelected,
                disabled && styles.weekLabelDisabled,
              ]}
            >
              {formatPeriodLabel('WEEK', range)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  week: {
    height: controlHeight.row,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.neutralBg,
    backgroundColor: colors.surface,
  },
  weekSelected: {
    borderColor: colors.ink,
    backgroundColor: colors.successBg,
  },
  pressed: {
    opacity: 0.7,
  },
  weekLabel: {
    fontFamily: bodyFont.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
  },
  weekLabelSelected: {
    color: colors.successText,
  },
  weekLabelDisabled: {
    color: colors.muted,
  },
});
