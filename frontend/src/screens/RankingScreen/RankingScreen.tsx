import { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import type { RankingScope } from '../../features/ranking/api/rankingApi';
import { useRankingQuery } from '../../features/ranking/hooks/useRankingQuery';
import { resolveApiErrorMessage } from '../../shared/api/resolveApiErrorMessage';
import { Card } from '../../shared/components/Card/Card';
import { Screen } from '../../shared/components/Screen/Screen';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { fontFamily } from '../../shared/constants/typography';
import { PodiumCard } from './components/PodiumCard';
import { RankingRow } from './components/RankingRow';
import { RankingScopeTabs } from './components/RankingScopeTabs';
import { RankingSkeleton } from './components/RankingSkeleton';
import { splitPodium } from './model';

const TITLE_ICON_SIZE = 26;

const EMPTY_MESSAGE = {
  friend: '아직 랭킹에 오른 친구가 없어요. 친구를 추가해 보세요.',
  region: '아직 이번 주 기록이 없어요. 산책하고 순위를 올려보세요!',
} as const;

export function RankingScreen() {
  const [scope, setScope] = useState<RankingScope>('friend');
  const ranking = useRankingQuery(scope);
  // 내가 누구인지는 같은 응답의 myRank로 안다. 회원 조회를 따로 걸지 않아도 되고,
  // 탭마다 순위가 달라지는 것도 자연스럽게 따라간다.
  const myRank = ranking.data?.myRank;

  const items = useMemo(
    () => ranking.data?.rankings.content ?? [],
    [ranking.data],
  );
  const { places, rest } = useMemo(() => splitPodium(items), [items]);
  const isEmpty = !ranking.isPending && !ranking.isError && items.length === 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            // 첫 로딩은 스켈레톤이 맡는다. 여기 스피너는 당겨서 새로고침만 알린다.
            refreshing={ranking.isRefetching}
            onRefresh={ranking.refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons
              name="trophy"
              size={TITLE_ICON_SIZE}
              color={colors.highlightBg}
            />
            <Text style={styles.title}>랭킹</Text>
          </View>
          <Text style={styles.subtitle}>
            열심히 걸어서 상위권을 노려보세요!
          </Text>
        </View>

        <RankingScopeTabs value={scope} onChange={setScope} />

        {ranking.isError ? (
          <Text style={styles.errorText} accessibilityLiveRegion="polite">
            {resolveApiErrorMessage(ranking.error)}
          </Text>
        ) : null}

        {ranking.isPending ? <RankingSkeleton /> : null}

        {items.length > 0 ? <PodiumCard places={places} /> : null}

        {rest.length > 0 ? (
          <Card style={styles.listCard}>
            {rest.map(item => (
              <RankingRow
                key={item.memberId}
                item={item}
                isMe={item.rank === myRank}
              />
            ))}
          </Card>
        ) : null}

        {isEmpty ? (
          <Text style={styles.emptyText}>{EMPTY_MESSAGE[scope]}</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    // 탭 바에 마지막 줄이 가리지 않도록 스크롤 끝에 여유를 둔다.
    paddingBottom: spacing.lg * 2,
  },
  header: {
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.ink,
    opacity: 0.5,
  },
  listCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.danger,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.ink,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
