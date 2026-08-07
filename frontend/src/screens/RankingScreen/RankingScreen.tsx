import { useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

import { formatThousands } from '../../features/history/model/format';
import { useMyCharacterQuery } from '../../features/member/hooks/useMyCharacterQuery';
import type { RankingScope } from '../../features/ranking/api/rankingApi';
import {
  RANKING_LIMIT,
  useRankingQuery,
} from '../../features/ranking/hooks/useRankingQuery';
import { resolveApiErrorMessage } from '../../shared/api/resolveApiErrorMessage';
import { AppText } from '../../shared/components/AppText/AppText';
import { Card } from '../../shared/components/Card/Card';
import { Fab } from '../../shared/components/Fab/Fab';
import { Screen } from '../../shared/components/Screen/Screen';
import { SegmentedControl } from '../../shared/components/SegmentedControl/SegmentedControl';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../shared/constants/typography';
import { MyRankBar } from './components/MyRankBar';
import { PodiumCard } from './components/PodiumCard';
import { RankingRow } from './components/RankingRow';
import { RankingSkeleton } from './components/RankingSkeleton';
import { orderRanking, splitPodium } from './model';
import { Header } from '../../shared/components/Header/Header';

/**
 * 실측 전에 쓸 내 순위 줄 높이. 첫 프레임에만 쓰이고 `onLayout`이 바로 덮는다.
 *
 * 상수로 고정하면 OS 글꼴 크기를 키운 기기에서 줄이 더 높아져 위에 얹은 버튼과
 * 겹친다.
 */
const MY_RANK_BAR_FALLBACK_HEIGHT = 60;

/** 이 순위 밖이 화면에 들어오기 시작하면 맨 위로 버튼을 띄운다. */
const SCROLL_TOP_AFTER_RANK = 10;
// 경계를 지나쳤는지 놓치지 않을 만큼 촘촘히 받는다(약 60fps).
const SCROLL_THROTTLE_MS = 16;

const EMPTY_MESSAGE = {
  friend: '아직 랭킹에 오른 친구가 없어요. 친구를 추가해 보세요.',
  region: '아직 이번 주 기록이 없어요. 산책하고 순위를 올려보세요!',
} as const;

// `GET /rankings`는 로그인 회원의 지역으로 좁혀 내려온다. '전체'가 아니다.
const SCOPE_OPTIONS: { label: string; value: RankingScope }[] = [
  { value: 'friend', label: '친구 랭킹' },
  { value: 'region', label: '지역 랭킹' },
];

export function RankingScreen() {
  const [scope, setScope] = useState<RankingScope>('friend');
  const [showScrollTop, setShowScrollTop] = useState(false);
  // 경계 줄의 y는 목록 카드 안에서 재므로, 카드의 y를 더해야 콘텐츠 좌표가 된다.
  const [listCardTop, setListCardTop] = useState<number | null>(null);
  const [cutoffRowTop, setCutoffRowTop] = useState<number | null>(null);
  const [myRankBarHeight, setMyRankBarHeight] = useState(
    MY_RANK_BAR_FALLBACK_HEIGHT,
  );
  const scrollRef = useRef<ScrollView>(null);
  const ranking = useRankingQuery(scope);
  // myRank로는 나를 못 가린다 — 동점자는 순위가 같아서 걸음 수가 모두 같으면
  // 전원이 내 순위가 된다. 닉네임은 DB에서 유일하므로(member.nickname unique)
  // 회원 조회의 닉네임으로 찾는다.
  const myCharacter = useMyCharacterQuery().data;
  const myNickname = myCharacter?.nickname;

  const items = useMemo(
    () => orderRanking(ranking.data?.rankings.content ?? [], myNickname),
    [ranking.data, myNickname],
  );
  const { places, rest } = useMemo(() => splitPodium(items), [items]);
  const isEmpty = !ranking.isPending && !ranking.isError && items.length === 0;

  // 20위권 안이면 목록에 내 줄이 있으므로 고정 줄이 필요 없다.
  const myRank = ranking.data?.myRank ?? 0;
  const isMyRankListed = myRank > 0 && myRank <= RANKING_LIMIT;
  const showMyRank =
    !isEmpty && !ranking.isPending && ranking.data != null && !isMyRankListed;
  const totalCount = ranking.data?.rankings.totalElements ?? 0;

  // 임의의 픽셀값으로 버튼을 띄우면 목록이 짧을 때도 뜨고, 글꼴·기기에 따라
  // 기준이 어긋난다. 그래서 경계 줄의 실제 위치를 쓴다.
  const cutoffOffset =
    listCardTop != null && cutoffRowTop != null
      ? listCardTop + cutoffRowTop
      : null;

  const handleScroll = ({
    nativeEvent,
  }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = nativeEvent;
    const bottomEdge = contentOffset.y + layoutMeasurement.height;

    // 같은 값이면 React가 리렌더를 건너뛰므로 매 프레임 넣어도 괜찮다.
    setShowScrollTop(cutoffOffset != null && bottomEdge > cutoffOffset);
  };

  const measureTop =
    (set: (value: number) => void) =>
    ({ nativeEvent }: LayoutChangeEvent) => {
      set(nativeEvent.layout.y);
    };

  // 인원이 적어 경계 줄이 없으면 버튼을 띄우지 않는다.
  const cutoffMemberId = rest.find(
    item => item.rank > SCROLL_TOP_AFTER_RANK,
  )?.memberId;

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const changeScope = (next: RankingScope) => {
    setScope(next);
    // 탭마다 다른 목록이다. 이전 탭에서 내려둔 위치도, 재둔 기준선도 못 쓴다.
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setShowScrollTop(false);
    setListCardTop(null);
    setCutoffRowTop(null);
  };

  return (
    <Screen>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          // 고정된 내 순위 줄에 마지막 항목이 가리지 않게 자리를 비운다.
          showMyRank && {
            paddingBottom: spacing.lg * 2 + myRankBarHeight,
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={SCROLL_THROTTLE_MS}
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
        <Header title="랭킹" subtitle="열심히 걸어서 상위권을 노려보세요" />

        {/* 동행 탭과 같은 전환 UI. 라벨 폰트도 동행 탭과 맞춘다. */}
        <SegmentedControl
          options={SCOPE_OPTIONS}
          value={scope}
          onChange={changeScope}
          labelStyle={styles.dohyeonText}
        />

        {ranking.isError ? (
          <AppText style={styles.errorText} accessibilityLiveRegion="polite">
            {resolveApiErrorMessage(ranking.error)}
          </AppText>
        ) : null}

        {ranking.isPending ? <RankingSkeleton /> : null}

        {items.length > 0 ? (
          <PodiumCard places={places} myNickname={myNickname} />
        ) : null}

        {rest.length > 0 ? (
          <>
            <AppText style={styles.countText}>
              총 {formatThousands(totalCount)}명 참여중
            </AppText>
            {/* Card는 onLayout을 받지 않아 래퍼로 위치를 잰다. */}
            <View onLayout={measureTop(setListCardTop)}>
              <Card style={styles.listCard}>
                {rest.map(item =>
                  item.memberId === cutoffMemberId ? (
                    <View
                      key={item.memberId}
                      onLayout={measureTop(setCutoffRowTop)}
                    >
                      <RankingRow
                        item={item}
                        isMe={item.nickname === myNickname}
                      />
                    </View>
                  ) : (
                    <RankingRow
                      key={item.memberId}
                      item={item}
                      isMe={item.nickname === myNickname}
                    />
                  ),
                )}
              </Card>
            </View>
          </>
        ) : null}

        {isEmpty ? (
          <AppText style={styles.emptyText}>{EMPTY_MESSAGE[scope]}</AppText>
        ) : null}
      </ScrollView>

      {/*
        둘을 한 컬럼에 담는다. 각각 절대 배치하고 bottom을 계산해 피하게 하면
        줄 높이를 잘못 잡는 순간 겹치는데, flex로 쌓으면 겹칠 수가 없다.
      */}
      <View style={styles.floating} pointerEvents="box-none">
        {showScrollTop ? (
          <View style={styles.scrollTop}>
            <Fab
              icon="arrow-up"
              onPress={scrollToTop}
              accessibilityLabel="맨 위로"
            />
          </View>
        ) : null}

        {showMyRank ? (
          // 터치는 아래 목록으로 흘려보낸다.
          <View
            pointerEvents="none"
            onLayout={event => {
              const { height } = event.nativeEvent.layout;
              // 0으로 잡히는 첫 프레임에 속으면 여백이 사라진다.
              if (height > 0) {
                setMyRankBarHeight(height);
              }
            }}
          >
            <MyRankBar
              rank={myRank}
              weeklySteps={ranking.data?.myWeeklySteps ?? 0}
              character={myCharacter}
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.lg * 2,
  },
  // 동행 탭(CompanionScreen)과 같은 값. 화면 로컬 스타일이라 각자 정의한다.
  dohyeonText: {
    fontFamily: 'BMDOHYEON',
  },
  listCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  countText: {
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.mutedStrong,
    marginBottom: -spacing.md,
    marginLeft: spacing.sm,
  },
  floating: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    gap: spacing.sm,
  },
  scrollTop: {
    // 버튼만 오른쪽에 붙인다. 내 순위 줄은 좌우로 꽉 찬다.
    alignSelf: 'flex-end',
  },
  errorText: {
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.danger,
  },
  emptyText: {
    fontFamily: bodyFont.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
