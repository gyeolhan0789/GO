import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';

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
};

type SegmentStat = {
  icon: IoniconsIconName;
  value: string;
  unit?: string;
  label: string;
};

const ICON_SIZE = 28;

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

/** 차트에서 고른 구간의 활동 기록. */
export function SegmentDetailSheet({
  segment,
  onClose,
}: SegmentDetailSheetProps) {
  // 닫히는 동안에도 내용이 남아 있어야 빈 시트가 내려가지 않는다.
  const [shownSegment, setShownSegment] = useState(segment);

  useEffect(() => {
    if (segment !== null) {
      setShownSegment(segment);
    }
  }, [segment]);

  return (
    <BottomSheet
      visible={segment !== null}
      onClose={onClose}
      title={shownSegment?.label}
    >
      {shownSegment === null ? null : (
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
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
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
    fontSize: 20,
    lineHeight: lineHeights[20],
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
});
