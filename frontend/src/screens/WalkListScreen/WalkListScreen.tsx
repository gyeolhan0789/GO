import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { WalkCard } from '../../features/history/components/WalkCard/WalkCard';
import { useWalksInfiniteQuery } from '../../features/history/hooks/useWalksInfiniteQuery';
import type { WalkRecord } from '../../features/history/types';
import { AppText } from '../../shared/components/AppText/AppText';
import { Fab } from '../../shared/components/Fab/Fab';
import { Screen } from '../../shared/components/Screen/Screen';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../shared/constants/typography';

type WalkListScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'WalkList'
>;

// 화면 끝에서 반 화면 남았을 때 다음 페이지를 부른다.
const END_REACHED_THRESHOLD = 0.5;
// 한 화면쯤 내려갔을 때부터 맨 위로 버튼을 띄운다. 조금만 스크롤해도 뜨면 거슬린다.
const SCROLL_TO_TOP_OFFSET = 600;

export function WalkListScreen({ navigation }: WalkListScreenProps) {
  const walksQuery = useWalksInfiniteQuery();
  const listRef = useRef<FlatList<WalkRecord>>(null);
  const [isScrolledDown, setScrolledDown] = useState(false);

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

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrolledDown(event.nativeEvent.contentOffset.y > SCROLL_TO_TOP_OFFSET);
  };

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  return (
    <Screen edges={SCREEN_EDGES}>
      <View style={styles.container}>
        {walksQuery.isLoading ? (
          <AppText style={styles.statusText}>불러오는 중...</AppText>
        ) : walksQuery.isError ? (
          <AppText style={styles.statusText}>산책 기록을 불러오지 못했어요.</AppText>
        ) : (
          <FlatList
            ref={listRef}
            onScroll={handleScroll}
            data={walks}
            keyExtractor={walk => String(walk.gameId)}
            renderItem={({ item }) => (
              <WalkCard
                walk={item}
                onPress={() =>
                  navigation.navigate('WalkDetail', { gameId: item.gameId })
                }
              />
            )}
            onEndReached={loadNextPage}
            onEndReachedThreshold={END_REACHED_THRESHOLD}
            ListEmptyComponent={
              <AppText style={styles.statusText}>아직 산책 기록이 없어요.</AppText>
            }
            ListFooterComponent={
              <View style={styles.footer}>
                {walksQuery.isFetchingNextPage ? (
                  <ActivityIndicator color={colors.primary} />
                ) : walks.length > 0 && !walksQuery.hasNextPage ? (
                  <AppText style={styles.footerText}>기록을 모두 봤어요</AppText>
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

        {isScrolledDown ? (
          <View style={styles.scrollToTop}>
            <Fab
              icon="arrow-up"
              onPress={scrollToTop}
              accessibilityLabel="맨 위로"
            />
          </View>
        ) : null}
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
    fontFamily: bodyFont.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
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
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.4,
  },
  scrollToTop: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
  },
});
