import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import type { HistoryPeriod } from '../../../../features/history/api/historyApi';
import {
  monthStartOf,
  shiftYear,
} from '../../../../features/history/model/calendar';
import {
  parseIsoDate,
  shiftPeriod,
} from '../../../../features/history/model/period';
import { AppText } from '../../../../shared/components/AppText/AppText';
import { BottomSheet } from '../../../../shared/components/BottomSheet/BottomSheet';
import { colors } from '../../../../shared/constants/colors';
import { spacing } from '../../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../../shared/constants/typography';
import { DayGrid } from './DayGrid';
import { MonthGrid } from './MonthGrid';
import { WeekList } from './WeekList';

type PeriodPickerProps = {
  visible: boolean;
  period: HistoryPeriod;
  /** 현재 기준일 'yyyy-MM-dd'. */
  value: string;
  /** 이 날짜 뒤는 고를 수 없다. 보통 오늘. */
  maxDate: string;
  onChange: (date: string) => void;
  onClose: () => void;
};

const SHEET_TITLE: Record<HistoryPeriod, string> = {
  DAY: '날짜 선택',
  WEEK: '주 선택',
  MONTH: '월 선택',
};

const ARROW_SIZE = 20;

/**
 * 어느 방식이든 결과는 날짜 하나다. resolvePeriodRange가 그 날짜에서 구간을
 * 유도하므로 구간별로 다른 값을 돌려줄 필요가 없다.
 */
export function PeriodPicker({
  visible,
  period,
  value,
  maxDate,
  onChange,
  onClose,
}: PeriodPickerProps) {
  const isYearly = period === 'MONTH';
  const [visibleMonth, setVisibleMonth] = useState(() => monthStartOf(value));

  // 닫아도 컴포넌트가 남아 있어서, 다시 열 때 보고 있는 구간으로 되돌린다.
  useEffect(() => {
    if (visible) {
      setVisibleMonth(monthStartOf(value));
    }
  }, [visible, value]);

  const visibleDate = parseIsoDate(visibleMonth);
  const headerLabel = isYearly
    ? `${visibleDate.getFullYear()}년`
    : `${visibleDate.getFullYear()}년 ${visibleDate.getMonth() + 1}월`;

  const goPrev = () =>
    setVisibleMonth(current =>
      isYearly ? shiftYear(current, -1) : shiftPeriod('MONTH', current, -1),
    );
  const goNext = () =>
    setVisibleMonth(current =>
      isYearly ? shiftYear(current, 1) : shiftPeriod('MONTH', current, 1),
    );

  // 오늘이 든 달/해 뒤로는 고를 수 있는 날이 없다.
  const maxMonth = monthStartOf(maxDate);
  const isNextDisabled = isYearly
    ? visibleDate.getFullYear() >= parseIsoDate(maxMonth).getFullYear()
    : visibleMonth >= maxMonth;

  const select = (date: string) => {
    onChange(date);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={SHEET_TITLE[period]}>
      <View style={styles.header}>
        <Pressable
          onPress={goPrev}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={isYearly ? '이전 해' : '이전 달'}
        >
          <Ionicons name="chevron-back" size={ARROW_SIZE} color={colors.ink} />
        </Pressable>

        <AppText style={styles.headerLabel}>{headerLabel}</AppText>

        <Pressable
          onPress={goNext}
          disabled={isNextDisabled}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={isYearly ? '다음 해' : '다음 달'}
          accessibilityState={{ disabled: isNextDisabled }}
        >
          <Ionicons
            name="chevron-forward"
            size={ARROW_SIZE}
            color={isNextDisabled ? colors.muted : colors.ink}
          />
        </Pressable>
      </View>

      {period === 'DAY' ? (
        <DayGrid
          visibleMonth={visibleMonth}
          selectedDate={value}
          maxDate={maxDate}
          onSelect={select}
        />
      ) : period === 'WEEK' ? (
        <WeekList
          visibleMonth={visibleMonth}
          selectedDate={value}
          maxDate={maxDate}
          onSelect={select}
        />
      ) : (
        <MonthGrid
          visibleYear={visibleMonth}
          selectedDate={value}
          maxDate={maxDate}
          onSelect={select}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  headerLabel: {
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.ink,
  },
});
