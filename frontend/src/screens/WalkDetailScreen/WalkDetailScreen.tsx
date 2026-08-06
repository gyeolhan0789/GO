import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { useWalkDetailQuery } from '../../features/history/hooks/useWalkDetailQuery';
import { AppText } from '../../shared/components/AppText/AppText';
import { Screen } from '../../shared/components/Screen/Screen';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../shared/constants/typography';
import { WalkBingoCard } from './components/WalkBingoCard';
import { WalkSummaryCard } from './components/WalkSummaryCard';

type WalkDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'WalkDetail'
>;

export function WalkDetailScreen({ route }: WalkDetailScreenProps) {
  const { walkSessionId } = route.params;

  const walkQuery = useWalkDetailQuery(walkSessionId);
  const walk = walkQuery.data ?? null;

  if (walkQuery.isLoading) {
    return (
      <Screen edges={SCREEN_EDGES}>
        <AppText style={styles.statusText}>불러오는 중...</AppText>
      </Screen>
    );
  }

  if (walkQuery.isError || !walk) {
    return (
      <Screen edges={SCREEN_EDGES}>
        <AppText style={styles.statusText}>산책 기록을 불러오지 못했어요.</AppText>
      </Screen>
    );
  }

  return (
    <Screen edges={SCREEN_EDGES}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <WalkSummaryCard walk={walk} />

        {/* 산책 도중 판을 갈면 여러 장이 된다. 시작한 판이 맨 앞이다. */}
        {walk.bingoBoards.map((board, index) => (
          <WalkBingoCard
            key={board.bingoBoardId}
            board={board}
            title={
              walk.bingoBoards.length > 1
                ? `빙고판 ${index + 1}`
                : '진행한 빙고판'
            }
          />
        ))}

        {/* 카드 오프셋 그림자가 스크롤 끝에서 잘리지 않게. */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </Screen>
  );
}

const SCREEN_EDGES = ['bottom'] as const;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.lg,
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
  bottomSpacer: {
    height: spacing.lg,
  },
});
