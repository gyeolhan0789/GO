import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';

import type { ChartSegment } from '../../../features/history/model/chartSegments';
import {
  formatDistance,
  formatThousands,
} from '../../../features/history/model/format';
import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';
import type { SegmentAnchor } from './resolvePopoverPosition';
import { resolvePopoverPosition } from './resolvePopoverPosition';

type SegmentDetailPopoverProps = {
  /** null이면 카드를 띄우지 않는다. */
  segment: ChartSegment | null;
  /** 누른 막대 자리. 재기 전에는 null이고, 그때는 화면 위쪽에 놓인다. */
  anchor: SegmentAnchor | null;
  onClose: () => void;
};

type SegmentStat = {
  icon: IoniconsIconName;
  value: string;
  unit?: string;
  label: string;
};

const ICON_SIZE = 22;
const MAX_WIDTH = 240;

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

/**
 * 차트에서 고른 구간의 신체 활동. 누른 막대 위에 떠서 화면을 덮지 않으므로 차트도
 * 같이 보인다. 어느 구간인지는 그 막대에 남는 표시가 알려준다(ChartSegmentOverlay).
 * 부모 카드 경계에 잘리지 않으려면 Modal이어야 한다(Select와 같은 이유).
 */
export function SegmentDetailPopover({
  segment,
  anchor,
  onClose,
}: SegmentDetailPopoverProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  if (segment === null) {
    return null;
  }

  const popoverWidth = Math.min(MAX_WIDTH, screenWidth - spacing.md * 2);
  const position =
    anchor === null
      ? null
      : resolvePopoverPosition({
          anchor,
          popoverWidth,
          screenWidth,
          screenHeight,
        });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* 배경을 어둡게 하지 않는다. 카드 밖을 누르면 닫히기만 한다. */}
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityLabel="구간 기록 닫기"
      >
        <View
          style={[
            styles.card,
            { width: popoverWidth },
            position && styles.cardAnchored,
            position &&
              (position.isAbove
                ? { bottom: position.offset, left: position.left }
                : { top: position.offset, left: position.left }),
          ]}
        >
          <AppText style={styles.title} numberOfLines={1}>
            {segment.label}
          </AppText>

          <View style={styles.statRow}>
            {buildStats(segment).map(stat => (
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
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    // 측정 전 폴백 위치.
    alignItems: 'center',
    paddingTop: spacing.xl * 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  cardAnchored: {
    position: 'absolute',
  },
  title: {
    fontFamily: bodyFont.bold,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  value: {
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.ink,
  },
  unit: {
    fontFamily: bodyFont.regular,
    fontSize: 10,
    lineHeight: lineHeights[10],
    color: colors.ink,
    opacity: 0.6,
  },
  statLabel: {
    fontFamily: bodyFont.regular,
    fontSize: 10,
    lineHeight: lineHeights[10],
    color: colors.ink,
    opacity: 0.5,
  },
});
