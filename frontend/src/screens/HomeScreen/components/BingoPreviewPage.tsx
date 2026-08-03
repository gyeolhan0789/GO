import { StyleSheet, View } from 'react-native';

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
  /** 이번 주 빙고판이 아직 없을 때 안내 문구. */
  hint?: string;
  /** 주면 칸이 눌린다(미션 정보 보기 등). */
  onCellPress?: (cell: BingoBoardCell) => void;
};

export function BingoPreviewPage({
  size,
  cells,
  hint,
  onCellPress,
}: BingoPreviewPageProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <AppText style={styles.title}>이번주 빙고 미션</AppText>
        {hint ? <AppText style={styles.hint}>{hint}</AppText> : null}
      </View>
      <View style={styles.board}>
        <BingoBoard size={size} cells={cells} onCellPress={onCellPress} />
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
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    lineHeight: lineHeights[20],
    color: colors.ink,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
  },
  board: {
    width: '85%',
  },
});
