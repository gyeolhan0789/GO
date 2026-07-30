import { StyleSheet, View } from 'react-native';

import { colors } from '../../../../shared/constants/colors';
import { radius } from '../../../../shared/constants/radius';

export type MemberProgressSegment = {
  /** 이 인원이 완료한 칸 수. */
  count: number;
  color: string;
};

type MemberProgressBarProps = {
  segments: MemberProgressSegment[];
  /** 빙고판 전체 칸 수. */
  total: number;
};

/** 완료한 인원별로 색이 이어지는 단일 막대. 네모칸 단위가 아니라 칸 수
 * 비율만큼 폭을 나눠 칠한다. */
export function MemberProgressBar({ segments, total }: MemberProgressBarProps) {
  const completedCount = segments.reduce((sum, segment) => sum + segment.count, 0);
  const remaining = Math.max(0, total - completedCount);

  return (
    <View style={styles.track}>
      {segments.map((segment, index) =>
        segment.count > 0 ? (
          <View
            key={index}
            style={[styles.segment, { flex: segment.count, backgroundColor: segment.color }]}
          />
        ) : null,
      )}
      {remaining > 0 ? <View style={{ flex: remaining }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 14,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.neutralBg,
    overflow: 'hidden',
  },
  segment: {
    height: '100%',
  },
});
