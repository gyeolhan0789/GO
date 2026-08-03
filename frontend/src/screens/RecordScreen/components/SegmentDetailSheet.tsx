import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';

import { WalkCard } from '../../../features/history/components/WalkCard/WalkCard';
import { useSegmentWalksQuery } from '../../../features/history/hooks/useSegmentWalksQuery';
import type { ChartSegment } from '../../../features/history/model/chartSegments';
import {
  formatDistance,
  formatThousands,
} from '../../../features/history/model/format';
import { AppText } from '../../../shared/components/AppText/AppText';
import { BottomSheet } from '../../../shared/components/BottomSheet/BottomSheet';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type SegmentDetailSheetProps = {
  /** null이면 시트를 닫는다. */
  segment: ChartSegment | null;
  onClose: () => void;
  onSelectWalk: (gameId: number) => void;
};

type SegmentStat = {
  icon: IoniconsIconName;
  value: string;
  unit?: string;
  label: string;
};

const ICON_SIZE = 24;
const LOADING_TEXT = '불러오는 중...';
/** 목록이 길어도 시트가 화면을 다 덮지 않게 자른다. 안에서 스크롤한다. */
const WALK_LIST_MAX_HEIGHT = 300;

function buildStats(segment: ChartSegment): SegmentStat[] {
  const stats: SegmentStat[] = [
    {
      icon: 'footsteps',
      value: formatThousands(segment.step),
      label: '걸음',
    },
  ];

  // 시간대 구간에는 거리·칼로리가 없다(ChartSegment 참고).
  if (segment.distance !== null) {
    const distance = formatDistance(segment.distance);
    stats.push({
      icon: 'location',
      value: distance.value,
      unit: distance.unit,
      label: '거리',
    });
  }

  if (segment.calories !== null) {
    stats.push({
      icon: 'flame',
      value: formatThousands(segment.calories),
      unit: 'kcal',
      label: '칼로리',
    });
  }

  return stats;
}

/** 차트에서 고른 구간의 합계와 그 구간에 걸친 산책 기록. */
export function SegmentDetailSheet({
  segment,
  onClose,
  onSelectWalk,
}: SegmentDetailSheetProps) {
  // 닫히는 동안에도 내용이 남아 있어야 빈 시트가 내려가지 않는다.
  const [shownSegment, setShownSegment] = useState(segment);

  useEffect(() => {
    if (segment !== null) {
      setShownSegment(segment);
    }
  }, [segment]);

  const walksQuery = useSegmentWalksQuery(shownSegment);
  const walks = walksQuery.data ?? [];

  return (
    <BottomSheet
      visible={segment !== null}
      onClose={onClose}
      title={shownSegment?.label}
    >
      {shownSegment === null ? null : (
        <>
          <View style={styles.statRow}>
            {buildStats(shownSegment).map(stat => (
              <View key={stat.label} style={styles.statCell}>
                <Ionicons
                  name={stat.icon}
                  size={ICON_SIZE}
                  color={colors.primarySoft}
                />
                <View style={styles.valueRow}>
                  <AppText style={styles.value} numberOfLines={1}>
                    {stat.value}
                  </AppText>
                  {stat.unit ? (
                    <AppText style={styles.unit}>{stat.unit}</AppText>
                  ) : null}
                </View>
                <AppText style={styles.statLabel}>{stat.label}</AppText>
              </View>
            ))}
          </View>

          <AppText style={styles.sectionTitle}>이 구간의 산책</AppText>

          {walksQuery.isLoading ? (
            <AppText style={styles.statusText}>{LOADING_TEXT}</AppText>
          ) : walks.length === 0 ? (
            <AppText style={styles.statusText}>
              이 구간에는 산책 기록이 없어요.
            </AppText>
          ) : (
            <FlatList
              data={walks}
              keyExtractor={walk => String(walk.gameId)}
              renderItem={({ item }) => (
                <WalkCard
                  walk={item}
                  onPress={() => onSelectWalk(item.gameId)}
                />
              )}
              style={styles.walkList}
              contentContainerStyle={styles.walkListContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: 'row',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  value: {
    fontFamily: bodyFont.bold,
    fontSize: 18,
    lineHeight: lineHeights[18],
    color: colors.ink,
  },
  unit: {
    fontFamily: bodyFont.regular,
    fontSize: 11,
    lineHeight: lineHeights[11],
    color: colors.ink,
    opacity: 0.6,
  },
  statLabel: {
    fontFamily: bodyFont.regular,
    fontSize: 11,
    lineHeight: lineHeights[11],
    color: colors.ink,
    opacity: 0.5,
  },
  sectionTitle: {
    fontFamily: bodyFont.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  statusText: {
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  walkList: {
    maxHeight: WALK_LIST_MAX_HEIGHT,
  },
  walkListContent: {
    gap: spacing.md,
    // 마지막 카드의 오프셋 그림자가 잘리지 않게.
    paddingBottom: spacing.xs,
  },
});
