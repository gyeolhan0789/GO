import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../../../shared/constants/colors';
import { radius } from '../../../../shared/constants/radius';

type BingoCellProps = {
  completed?: boolean;
  /** Color of whoever completed this cell. Defaults to the brand primary for
   * solo boards where completions aren't attributed to a specific member. */
  color?: string;
  /**
   * 남이 사진을 올려 검증을 기다리는 칸. 협동은 판을 공유해서 같은 칸을 둘이
   * 하면 나중 사람이 헛수고가 되므로, 잡혀 있다는 걸 칸에서 바로 보여준다.
   */
  pending?: boolean;
  children?: ReactNode;
};

export function BingoCell({
  completed = false,
  color = colors.primary,
  pending = false,
  children,
}: BingoCellProps) {
  return (
    <View
      style={[
        styles.cell,
        completed ? { backgroundColor: color } : styles.incomplete,
        // 완료된 칸은 이미 색이 찼으니 검증 중 표시가 필요 없다.
        !completed && pending ? styles.pending : null,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomplete: {
    backgroundColor: colors.neutralBg,
  },
  // 점선 테두리로 "아직 확정 아님"을 완료 칸과 구분한다.
  pending: {
    borderStyle: 'dashed',
    opacity: 0.55,
  },
});
