import { StyleSheet, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radius } from '../../constants/radius';

export type MemberProgressSegment = {
  /** 이 인원의 기여량(빙고 완료 칸 수, 걸음 수 등). */
  value: number;
  color: string;
};

type MemberProgressBarProps = {
  segments: MemberProgressSegment[];
  /** 전체 목표량(전체 칸 수, 목표 걸음 수 등). */
  total: number;
};

/** 인원별로 색이 이어지는 단일 막대. 네모칸 단위가 아니라 기여량 비율만큼
 * 폭을 나눠 칠한다. 빙고 완료 칸/걸음 수처럼 "누가 얼마나 기여했는지"를
 * 보여줘야 하는 곳이면 어디든 재사용한다. */
export function MemberProgressBar({ segments, total }: MemberProgressBarProps) {
  const filledValue = segments.reduce((sum, segment) => sum + segment.value, 0);
  const remaining = Math.max(0, total - filledValue);

  return (
    <View style={styles.track}>
      {segments.map((segment, index) =>
        segment.value > 0 ? (
          <View
            key={index}
            style={[styles.segment, { flex: segment.value, backgroundColor: segment.color }]}
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
