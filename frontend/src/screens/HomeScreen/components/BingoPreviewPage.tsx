import { StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import type {
  BingoBoardCell,
  BingoBoardSize,
} from '../../../features/bingo/components/BingoBoard/BingoBoard';
import { BingoBoard } from '../../../features/bingo/components/BingoBoard/BingoBoard';
import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../../shared/constants/typography';

type BingoPreviewPageProps = {
  size: BingoBoardSize;
  cells: BingoBoardCell[];
};

export function BingoPreviewPage({ size, cells }: BingoPreviewPageProps) {
  const cellsWithIcons = cells.map(cell => ({
    ...cell,
    icon: cell.completed ? (
      <Ionicons name="checkmark" size={18} color={colors.surface} />
    ) : undefined,
  }));

  return (
    <View style={styles.panel}>
      <AppText style={styles.title}>이번주 빙고 미션</AppText>
      <View style={styles.board}>
        <BingoBoard size={size} cells={cellsWithIcons} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    lineHeight: lineHeights[20],
    color: colors.ink,
  },
  board: {
    width: '85%',
  },
});
