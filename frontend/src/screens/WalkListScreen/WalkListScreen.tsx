import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { WalkCard } from '../../features/history/components/WalkCard/WalkCard';
import {
  WALK_DATE_PRESET_OPTIONS,
  WALK_FILTER_OPTIONS,
  WALK_SORT_OPTIONS,
} from '../../features/history/constants/walkList';
import { useWalksInfiniteQuery } from '../../features/history/hooks/useWalksInfiniteQuery';
import { todayIso } from '../../features/history/model/period';
import {
  formatDateRangeLabel,
  resolveDateRange,
} from '../../features/history/model/walkList';
import type {
  RecentWalk,
  WalkDatePreset,
  WalkFilter,
  WalkSort,
} from '../../features/history/types';
import { Screen } from '../../shared/components/Screen/Screen';
import { Select } from '../../shared/components/Select/Select';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';

type WalkListScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'WalkList'
>;

// 화면 끝에서 반 화면 남았을 때 다음 페이지를 부른다.
const END_REACHED_THRESHOLD = 0.5;
const DATE_MENU_WIDTH = 148;

export function WalkListScreen({ navigation }: WalkListScreenProps) {
  const [datePreset, setDatePreset] = useState<WalkDatePreset>('all');
  const [filter, setFilter] = useState<WalkFilter>('all');
  const [sort, setSort] = useState<WalkSort>('latest');
  const listRef = useRef<FlatList<RecentWalk>>(null);

  // 프리셋은 상대적이라 실제 날짜는 오늘 기준으로 그때그때 푼다.
  const dateRange = resolveDateRange(datePreset, todayIso());
  const walksQuery = useWalksInfiniteQuery(filter, sort, dateRange);

  const walks = useMemo(
    () => walksQuery.data?.pages.flatMap(page => page.content) ?? [],
    [walksQuery.data],
  );

  const loadNextPage = () => {
    // onEndReached는 스크롤 도중 여러 번 발화해서, 막지 않으면 중복 요청한다.
    if (walksQuery.hasNextPage && !walksQuery.isFetchingNextPage) {
      walksQuery.fetchNextPage();
    }
  };

  // 조건을 바꾸면 목록이 달라지므로 스크롤을 맨 위로 돌린다.
  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const changeDatePreset = (next: WalkDatePreset) => {
    setDatePreset(next);
    scrollToTop();
  };

  const changeFilter = (next: WalkFilter) => {
    setFilter(next);
    scrollToTop();
  };

  const changeSort = (next: WalkSort) => {
    setSort(next);
    scrollToTop();
  };

  return (
    <Screen edges={SCREEN_EDGES}>
      <View style={styles.container}>
        {/* 목록 밖에 고정한다. 안에 두면 로딩·빈 결과일 때 사라져 되돌릴 수 없다. */}
        <View style={styles.controls}>
          <Select
            options={WALK_DATE_PRESET_OPTIONS}
            value={datePreset}
            onChange={changeDatePreset}
            name="기간"
            // 프리셋 이름보다 실제 날짜가 정확하다.
            triggerLabel={formatDateRangeLabel(dateRange)}
            menuWidth={DATE_MENU_WIDTH}
            variant="pill"
          />
          <Select
            options={WALK_FILTER_OPTIONS}
            value={filter}
            onChange={changeFilter}
            name="인원"
            variant="pill"
          />
          <Select
            options={WALK_SORT_OPTIONS}
            value={sort}
            onChange={changeSort}
            name="정렬"
            variant="pill"
          />
        </View>

        {walksQuery.isLoading ? (
          <Text style={styles.statusText}>불러오는 중...</Text>
        ) : walksQuery.isError ? (
          <Text style={styles.statusText}>산책 기록을 불러오지 못했어요.</Text>
        ) : (
          <FlatList
            ref={listRef}
            data={walks}
            keyExtractor={walk => String(walk.walkId)}
            renderItem={({ item }) => (
              <WalkCard
                walk={item}
                onPress={() =>
                  navigation.navigate('WalkDetail', { walkId: item.walkId })
                }
              />
            )}
            onEndReached={loadNextPage}
            onEndReachedThreshold={END_REACHED_THRESHOLD}
            ListEmptyComponent={
              <Text style={styles.statusText}>
                {filter === 'all' && datePreset === 'all'
                  ? '아직 산책 기록이 없어요.'
                  : '조건에 맞는 산책이 없어요.'}
              </Text>
            }
            ListFooterComponent={
              <View style={styles.footer}>
                {walksQuery.isFetchingNextPage ? (
                  <ActivityIndicator color={colors.primary} />
                ) : walks.length > 0 && !walksQuery.hasNextPage ? (
                  <Text style={styles.footerText}>기록을 모두 봤어요</Text>
                ) : null}
              </View>
            }
            refreshing={
              walksQuery.isRefetching && !walksQuery.isFetchingNextPage
            }
            onRefresh={() => walksQuery.refetch()}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Screen>
  );
}

const SCREEN_EDGES = ['bottom'] as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    // 좁은 화면에서 잘리지 않게 다음 줄로 넘긴다.
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  statusText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 14,
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  footer: {
    // 스피너가 들어와도 목록이 튀지 않게 자리를 잡아둔다.
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 12,
    color: colors.ink,
    opacity: 0.4,
  },
});
