import { useMemo } from 'react';
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
import { useWalksInfiniteQuery } from '../../features/history/hooks/useWalksInfiniteQuery';
import { Screen } from '../../shared/components/Screen/Screen';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';

type WalkListScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'WalkList'
>;

// 화면 끝에서 반 화면 남았을 때 다음 페이지를 부른다.
const END_REACHED_THRESHOLD = 0.5;

export function WalkListScreen({ navigation }: WalkListScreenProps) {
  const walksQuery = useWalksInfiniteQuery();

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

  return (
    <Screen edges={SCREEN_EDGES}>
      <View style={styles.container}>
        {walksQuery.isLoading ? (
          <Text style={styles.statusText}>불러오는 중...</Text>
        ) : walksQuery.isError ? (
          <Text style={styles.statusText}>산책 기록을 불러오지 못했어요.</Text>
        ) : (
          <FlatList
            data={walks}
            keyExtractor={walk => String(walk.roomId)}
            renderItem={({ item }) => (
              <WalkCard
                walk={item}
                onPress={() =>
                  navigation.navigate('WalkDetail', { roomId: item.roomId })
                }
              />
            )}
            onEndReached={loadNextPage}
            onEndReachedThreshold={END_REACHED_THRESHOLD}
            ListEmptyComponent={
              <Text style={styles.statusText}>아직 산책 기록이 없어요.</Text>
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
