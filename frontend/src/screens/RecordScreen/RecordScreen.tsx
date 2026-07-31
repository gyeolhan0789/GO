import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import type { HistoryPeriod } from '../../features/history/api/historyApi';
import { WalkCard } from '../../features/history/components/WalkCard/WalkCard';
import { AppText } from '../../shared/components/AppText/AppText';
import { PERIOD_OPTIONS } from '../../features/history/constants/periods';
import { useHistoriesQuery } from '../../features/history/hooks/useHistoriesQuery';
import { useHourlyStepsQuery } from '../../features/history/hooks/useHourlyStepsQuery';
import { useRecentWalksQuery } from '../../features/history/hooks/useRecentWalksQuery';
import {
  formatPeriodLabel,
  isCurrentPeriod,
  resolvePeriodRange,
  shiftPeriod,
  todayIso,
} from '../../features/history/model/period';
import { Header } from '../../shared/components/Header/Header';
import { Screen } from '../../shared/components/Screen/Screen';
import { Select } from '../../shared/components/Select/Select';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../shared/constants/typography';
import { PeriodPicker } from './components/PeriodPicker/PeriodPicker';
import { PeriodRangeNavigator } from './components/PeriodRangeNavigator';
import { StepSummaryCard } from './components/StepSummaryCard';
import { ViewAllRecordsButton } from './components/ViewAllRecordsButton';

const LOADING_TEXT = '불러오는 중...';

export function RecordScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [period, setPeriod] = useState<HistoryPeriod>('WEEK');
  const [baseDate, setBaseDate] = useState(todayIso);
  const [isPickerOpen, setPickerOpen] = useState(false);

  // 자정을 넘겨도 화면이 살아 있을 수 있어 렌더마다 다시 읽는다.
  const today = todayIso();
  const range = useMemo(
    () => resolvePeriodRange(period, baseDate),
    [period, baseDate],
  );
  const isLatestPeriod = isCurrentPeriod(period, baseDate, today);

  const historiesQuery = useHistoriesQuery(period, baseDate);
  // 일간 차트만 쓰므로 그 구간에서만 불러온다.
  const hourlyStepsQuery = useHourlyStepsQuery(baseDate, period === 'DAY');
  const recentWalksQuery = useRecentWalksQuery();

  const hourlySteps = hourlyStepsQuery.data ?? [];
  const recentWalks = recentWalksQuery.data ?? [];

  const goPrevPeriod = () => setBaseDate(prev => shiftPeriod(period, prev, -1));
  const goNextPeriod = () => setBaseDate(prev => shiftPeriod(period, prev, 1));

  return (
    <Screen>
      <View style={styles.content}>
        <Header
          title="기록"
          subtitle="지금까지 진행한 기록을 확인해보세요"
        />

        <FlatList
          data={recentWalks}
          keyExtractor={walk => String(walk.roomId)}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.periodRow}>
                <PeriodRangeNavigator
                  label={formatPeriodLabel(period, range)}
                  onPrev={goPrevPeriod}
                  onNext={goNextPeriod}
                  isNextDisabled={isLatestPeriod}
                  onPressLabel={() => setPickerOpen(true)}
                />
                <Select
                  options={PERIOD_OPTIONS}
                  value={period}
                  onChange={setPeriod}
                  name="기간"
                />
              </View>

              {historiesQuery.isLoading ? (
                <AppText style={styles.statusText}>{LOADING_TEXT}</AppText>
              ) : historiesQuery.isError || !historiesQuery.data ? (
                <AppText style={styles.statusText}>
                  {historiesQuery.error instanceof Error
                    ? historiesQuery.error.message
                    : '활동 기록을 불러오지 못했어요.'}
                </AppText>
              ) : (
                <StepSummaryCard
                  history={historiesQuery.data}
                  hourlySteps={hourlySteps}
                  isCurrentPeriod={isLatestPeriod}
                  todayIsoDate={today}
                />
              )}

              <AppText style={styles.sectionTitle}>최근 산책</AppText>
            </View>
          }
          ListEmptyComponent={
            <AppText style={styles.statusText}>
              {recentWalksQuery.isLoading
                ? LOADING_TEXT
                : recentWalksQuery.isError
                ? '산책 기록을 불러오지 못했어요.'
                : '아직 산책 기록이 없어요.'}
            </AppText>
          }
          renderItem={({ item }) => (
            <WalkCard
              walk={item}
              onPress={() =>
                navigation.navigate('WalkDetail', { roomId: item.roomId })
              }
            />
          )}
          ListFooterComponent={
            <View style={styles.listFooter}>
              <ViewAllRecordsButton
                label="전체 기록 보기"
                onPress={() => navigation.navigate('WalkList')}
              />
            </View>
          }
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <PeriodPicker
        visible={isPickerOpen}
        period={period}
        value={baseDate}
        maxDate={today}
        onChange={setBaseDate}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    // 하단 여백은 listContent가 준다. 여기서 주면 FlatList 뷰포트가 짧아진다.
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  list: {
    flex: 1,
  },
  listHeader: {
    gap: spacing.md,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.ink,
  },
  statusText: {
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  listFooter: {
    marginTop: spacing.md,
  },
  listContent: {
    gap: spacing.md,
    // 탭 바에 마지막 줄이 가리지 않게.
    paddingBottom: spacing.lg * 2,
  },
});
