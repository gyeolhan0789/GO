import { Pressable, StyleSheet, View } from 'react-native';

import type { ChartSegment } from '../../../features/history/model/chartSegments';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { BAR_SLOT_RATIO, Y_AXIS_GUTTER } from '../chartConfig';

type ChartSegmentOverlayProps = {
  /** 차트에 그려진 순서와 같아야 한다(buildChartSegments 참고). */
  segments: ChartSegment[];
  /** 눌린 표시를 막대 자리에 맞춘다. 막대가 없는 일간 곡선에서는 칸 전체다. */
  alignHighlightToBar: boolean;
  onSelect: (segment: ChartSegment) => void;
};

/**
 * chart-kit은 막대·지점을 눌러도 알려주지 않는다. 그래서 차트 위에 구간 수만큼
 * 균등 분할한 투명 버튼을 덮는다. 왼쪽 Y_AXIS_GUTTER는 y축 라벨 자리라 비운다.
 *
 * 누르는 자리는 막대 하나가 아니라 그 칸 전체(라벨까지)다. 막대만 받으면 걸음이
 * 적은 날의 짧은 막대를 누를 수 없다.
 */
export function ChartSegmentOverlay({
  segments,
  alignHighlightToBar,
  onSelect,
}: ChartSegmentOverlayProps) {
  return (
    <View style={styles.overlay}>
      {segments.map(segment => (
        <Pressable
          key={segment.index}
          onPress={() => onSelect(segment)}
          style={styles.slot}
          accessibilityRole="button"
          accessibilityLabel={`${segment.label} 기록 보기`}
        >
          {({ pressed }) =>
            pressed ? (
              <View style={styles.highlightRow}>
                {alignHighlightToBar ? <View style={styles.beforeBar} /> : null}
                <View style={styles.highlight} />
              </View>
            ) : null
          }
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    // y축 라벨 자리를 비워야 첫 칸이 왼쪽으로 밀리지 않는다.
    left: Y_AXIS_GUTTER,
    right: 0,
    flexDirection: 'row',
  },
  slot: {
    flex: 1,
  },
  highlightRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  /**
   * chart-kit은 막대를 칸 왼쪽에서 `barWidth / 2`만큼 밀어 그려서 막대가 칸의
   * 오른쪽 끝에 붙는다(resolveBarPercentage 참고). 그만큼 비워야 눌린 표시가
   * 막대와 겹친다.
   */
  beforeBar: {
    flex: 1 - BAR_SLOT_RATIO,
  },
  highlight: {
    // 형제가 없으면(막대 없는 곡선) 이 비율과 무관하게 칸을 다 채운다.
    flex: BAR_SLOT_RATIO,
    backgroundColor: colors.successBg,
    borderRadius: radius.xs,
    opacity: 0.5,
  },
});
