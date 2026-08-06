import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ChartSegment } from '../../../features/history/model/chartSegments';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { BAR_SLOT_RATIO, Y_AXIS_GUTTER } from '../chartConfig';
import type { SegmentAnchor } from './resolvePopoverPosition';

type ChartSegmentOverlayProps = {
  /** 차트에 그려진 순서와 같아야 한다(buildChartSegments 참고). */
  segments: ChartSegment[];
  /** 눌린 표시를 막대 자리에 맞춘다. 막대가 없는 일간 곡선에서는 칸 전체다. */
  alignHighlightToBar: boolean;
  /** 열려 있는 구간. 카드가 떠 있는 동안 그 막대에 표시를 남겨 둔다. */
  selectedIndex: number | null;
  /**
   * anchor는 막대 자리를 재고 나서야 나오므로, 먼저 null로 한 번 부르고 재고
   * 나서 다시 부른다. 재기를 기다리면 누른 뒤 카드가 늦게 뜬다.
   */
  onSelect: (segment: ChartSegment, anchor: SegmentAnchor | null) => void;
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
  selectedIndex,
  onSelect,
}: ChartSegmentOverlayProps) {
  const overlayRef = useRef<View>(null);

  /**
   * 막대는 칸 오른쪽에 붙어 그려지므로(BAR_SLOT_RATIO) 칸 중심이 아니라 막대
   * 중심을 넘겨야 카드가 누른 막대에 맞춰 선다.
   */
  const measureAnchor = (segment: ChartSegment) => {
    const overlay = overlayRef.current;

    if (!overlay?.measureInWindow) {
      return;
    }

    overlay.measureInWindow((x, y, width, height) => {
      const slotWidth = width / segments.length;
      const barCenterRatio = alignHighlightToBar ? 1 - BAR_SLOT_RATIO / 2 : 0.5;

      onSelect(segment, {
        centerX: x + (segment.index + barCenterRatio) * slotWidth,
        top: y,
        bottom: y + height,
      });
    });
  };

  return (
    <View ref={overlayRef} style={styles.overlay}>
      {segments.map(segment => (
        <Pressable
          key={segment.index}
          onPress={() => {
            onSelect(segment, null);
            measureAnchor(segment);
          }}
          style={styles.slot}
          accessibilityRole="button"
          accessibilityState={{ selected: segment.index === selectedIndex }}
          accessibilityLabel={`${segment.label} 기록 보기`}
        >
          {({ pressed }) =>
            pressed || segment.index === selectedIndex ? (
              <View style={styles.highlightRow}>
                {alignHighlightToBar ? (
                  <>
                    <View style={styles.beforeBar} />
                    <View style={styles.barHighlight} />
                  </>
                ) : (
                  <View style={styles.slotHighlight} />
                )}
              </View>
            ) : null
          }
        </Pressable>
      ))}
    </View>
  );
}

/** 눌린 구간을 덮는 옅은 면. 폭만 자리에 따라 달라진다. */
const HIGHLIGHT_LOOK = {
  backgroundColor: colors.successBg,
  borderRadius: radius.xs,
  opacity: 0.5,
} as const;

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
  barHighlight: {
    ...HIGHLIGHT_LOOK,
    // beforeBar와 더해 1이 되어야 둘이 칸을 정확히 나눠 가진다.
    flex: BAR_SLOT_RATIO,
  },
  /**
   * 막대 없는 곡선(일간)은 칸 전체가 그 구간이다. 여기에 BAR_SLOT_RATIO를 주면
   * flex 합이 1보다 작아 표시가 칸의 2/3만 덮어 3시간 경계와 어긋난다.
   */
  slotHighlight: {
    ...HIGHLIGHT_LOOK,
    flex: 1,
  },
});
