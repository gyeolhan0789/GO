import { Pressable, StyleSheet, View } from 'react-native';

import { monthOfYear } from '../../../../features/history/model/calendar';
import { parseIsoDate } from '../../../../features/history/model/period';
import { AppText } from '../../../../shared/components/AppText/AppText';
import { controlHeight } from '../../../../shared/constants/sizing';
import { colors } from '../../../../shared/constants/colors';
import { radius } from '../../../../shared/constants/radius';
import { spacing } from '../../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../../shared/constants/typography';
import { useMeasuredWidth } from '../../../../shared/hooks/useMeasuredWidth';

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
  const { width, onLayout } = useMeasuredWidth();
  // 퍼센트로는 "칸 너비 = (전체 - 간격들) / 4"를 표현할 수 없다. 실측 폭에서
  // 간격을 먼저 빼고 나눈 뒤 내림해서, 어떤 기기 폭에서도 정확히 4개씩 앉게 한다.
  const monthWidth =
    width > 0
      ? Math.floor(
          (width - spacing.sm * (MONTHS_PER_ROW - 1)) / MONTHS_PER_ROW,
        )
      : 0;

  return (
    <View style={styles.grid} onLayout={onLayout}>
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
              { width: monthWidth },
              isSelected && styles.monthSelected,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${year}년 ${monthIndex + 1}월`}
            accessibilityState={{ selected: isSelected, disabled }}
          >
            <AppText
              style={[
                styles.monthLabel,
                isSelected && styles.monthLabelSelected,
                disabled && styles.monthLabelDisabled,
              ]}
            >
              {`${monthIndex + 1}월`}
            </AppText>
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
    height: controlHeight.row,
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
    fontFamily: bodyFont.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
  },
  monthLabelSelected: {
    color: colors.successText,
  },
  monthLabelDisabled: {
    color: colors.muted,
  },
});
