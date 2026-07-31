import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { useWalkDetailQuery } from '../../features/history/hooks/useWalkDetailQuery';
import { Screen } from '../../shared/components/Screen/Screen';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { ParticipantList } from './components/ParticipantList';
import { WalkBingoCard } from './components/WalkBingoCard';
import { WalkSummaryCard } from './components/WalkSummaryCard';

type WalkDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'WalkDetail'
>;

export function WalkDetailScreen({ route }: WalkDetailScreenProps) {
  const { roomId } = route.params;

  const walkQuery = useWalkDetailQuery(roomId);
  const { walk } = walkQuery;

  if (walkQuery.isLoading) {
    return (
      <Screen edges={SCREEN_EDGES}>
        <Text style={styles.statusText}>불러오는 중...</Text>
      </Screen>
    );
  }

  if (walkQuery.isError || !walk) {
    return (
      <Screen edges={SCREEN_EDGES}>
        <Text style={styles.statusText}>산책 기록을 불러오지 못했어요.</Text>
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

        <ParticipantList participants={walk.participants} />

        <WalkBingoCard
          size={walk.bingoSize}
          cells={walk.bingoCells}
          participants={walk.participants}
        />

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
    fontFamily: 'BMDOHYEON',
    fontSize: 14,
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  bottomSpacer: {
    height: spacing.lg,
  },
});
