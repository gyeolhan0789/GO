import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../../../shared/constants/colors';
import { radius } from '../../../../shared/constants/radius';

type BingoCellProps = {
  completed?: boolean;
  /** Color of whoever completed this cell. Defaults to the brand primary for
   * solo boards where completions aren't attributed to a specific member. */
  color?: string;
  children?: ReactNode;
};

export function BingoCell({
  completed = false,
  color = colors.primary,
  children,
}: BingoCellProps) {
  return (
    <View
      style={[
        styles.cell,
        completed ? { backgroundColor: color } : styles.incomplete,
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
});
