import { Pressable, StyleSheet, Text, View } from 'react-native';

import { monthOfYear } from '../../../../features/history/model/calendar';
import { parseIsoDate } from '../../../../features/history/model/period';
import { colors } from '../../../../shared/constants/colors';
import { radius } from '../../../../shared/constants/radius';
import { spacing } from '../../../../shared/constants/spacing';

type MonthGridProps = {
  /** 보고 있는 해. 그 해 아무 날짜의 'yyyy-MM-dd'. */
  visibleYear: string;
  /** 선택된 기준일. 이 날이 든 달이 선택 상태가 된다. */
  selectedDate: string;
  /** 이 날짜 뒤로 시작하는 달은 고를 수 없다. */
  maxDate: string;
  onSelect: (monthStart: string) => void;
};

const MONTHS_PER_YEAR = 12;
const MONTHS_PER_ROW = 4;

/** 월간용 월 목록. */
export function MonthGrid({
  visibleYear,
  selectedDate,
  maxDate,
  onSelect,
}: MonthGridProps) {
  const selected = parseIsoDate(selectedDate);
  const year = parseIsoDate(visibleYear).getFullYear();

  return (
    <View style={styles.grid}>
      {Array.from({ length: MONTHS_PER_YEAR }, (_, monthIndex) => {
        const monthStart = monthOfYear(visibleYear, monthIndex);
        const isSelected =
          year === selected.getFullYear() && monthIndex === selected.getMonth();
        const disabled = monthStart > maxDate;

        return (
          <Pressable
            key={monthIndex}
            onPress={() => onSelect(monthStart)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.month,
              isSelected && styles.monthSelected,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${year}년 ${monthIndex + 1}월`}
            accessibilityState={{ selected: isSelected, disabled }}
          >
            <Text
              style={[
                styles.monthLabel,
                isSelected && styles.monthLabelSelected,
                disabled && styles.monthLabelDisabled,
              ]}
            >
              {`${monthIndex + 1}월`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  month: {
    // 한 줄에 4개.
    flexGrow: 1,
    flexBasis: `${100 / MONTHS_PER_ROW - spacing.sm}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.neutralBg,
    backgroundColor: colors.surface,
  },
  monthSelected: {
    borderColor: colors.ink,
    backgroundColor: colors.successBg,
  },
  pressed: {
    opacity: 0.7,
  },
  monthLabel: {
    fontFamily: 'BMDOHYEON',
    fontSize: 14,
    color: colors.ink,
  },
  monthLabelSelected: {
    color: colors.successText,
  },
  monthLabelDisabled: {
    color: colors.muted,
  },
});
