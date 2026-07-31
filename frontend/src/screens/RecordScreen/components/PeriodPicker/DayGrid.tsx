import { Pressable, StyleSheet, View } from 'react-native';

import {
  eachDayInMonth,
  leadingBlankCount,
} from '../../../../features/history/model/calendar';
import { parseIsoDate } from '../../../../features/history/model/period';
import { AppText } from '../../../../shared/components/AppText/AppText';
import { colors } from '../../../../shared/constants/colors';
import { radius } from '../../../../shared/constants/radius';
import { spacing } from '../../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../../shared/constants/typography';

type DayGridProps = {
  /** 보고 있는 달. 그 달 1일의 'yyyy-MM-dd'. */
  visibleMonth: string;
  /** 선택된 날짜 'yyyy-MM-dd'. */
  selectedDate: string;
  /** 이 날짜 뒤는 고를 수 없다. */
  maxDate: string;
  onSelect: (date: string) => void;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 일간용 날짜 달력. */
export function DayGrid({
  visibleMonth,
  selectedDate,
  maxDate,
  onSelect,
}: DayGridProps) {
  const days = eachDayInMonth(visibleMonth);
  const blanks = leadingBlankCount(visibleMonth);

  return (
    <View>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map(weekday => (
          <AppText key={weekday} style={styles.weekday}>
            {weekday}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {/* 1일이 시작하는 요일에 맞춰 앞을 비운다. */}
        {Array.from({ length: blanks }, (_, index) => (
          <View key={`blank-${index}`} style={styles.cell} />
        ))}

        {days.map(day => {
          const isSelected = day === selectedDate;
          const disabled = day > maxDate;

          return (
            <View key={day} style={styles.cell}>
              <Pressable
                onPress={() => onSelect(day)}
                disabled={disabled}
                style={({ pressed }) => [
                  styles.day,
                  isSelected && styles.daySelected,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${parseIsoDate(day).getDate()}일`}
                accessibilityState={{ selected: isSelected, disabled }}
              >
                <AppText
                  style={[
                    styles.dayLabel,
                    isSelected && styles.dayLabelSelected,
                    disabled && styles.dayLabelDisabled,
                  ]}
                >
                  {parseIsoDate(day).getDate()}
                </AppText>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekday: {
    // 아래 날짜 칸과 같은 폭이라야 요일이 어긋나지 않는다.
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: bodyFont.regular,
    fontSize: 11,
    lineHeight: lineHeights[11],
    color: colors.ink,
    opacity: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  daySelected: {
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.successBg,
  },
  pressed: {
    opacity: 0.6,
  },
  dayLabel: {
    fontFamily: bodyFont.bold,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
  },
  dayLabelSelected: {
    color: colors.successText,
  },
  dayLabelDisabled: {
    color: colors.muted,
  },
});
