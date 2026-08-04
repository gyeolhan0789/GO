import { StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { BingoBoard } from '../../../features/bingo/components/BingoBoard/BingoBoard';
import type { BingoBoardSize } from '../../../features/bingo/components/BingoBoard/BingoBoard';
import { countAchievedCells } from '../../../features/history/model/walkDetail';
import type { WalkBingoBoard } from '../../../features/history/types';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type WalkBingoCardProps = {
  board: WalkBingoBoard;
  /** 산책 도중 판을 갈면 여러 장이 되므로 몇 번째 판인지 알려준다. */
  title: string;
};

const SWATCH_SIZE = 14;

/**
 * 판이 커질수록 칸이 좁아져 같은 크기로는 미션 제목이 안 들어간다.
 * 체크 표시는 색만으로 완료를 알리지 않기 위해 남긴다.
 */
const CELL_TEXT = {
  3: { check: 16, font: 11, lines: 3 },
  4: { check: 13, font: 9, lines: 3 },
  5: { check: 11, font: 8, lines: 2 },
} as const satisfies Record<
  BingoBoardSize,
  { check: number; font: number; lines: number }
>;

/**
 * 기록은 '이 산책이 뭘 했는지'를 보여주는 자리다. 그래서 누가 깼는지가 아니라
 * 이번 산책에 깼는지로 칸을 가른다 — 지난 산책에서 이미 승인된 칸은 판에
 * 남아 있지만 이번 몫은 아니다.
 */
export function WalkBingoCard({ board, title }: WalkBingoCardProps) {
  const { cells } = board;
  const achievedCount = countAchievedCells(cells);
  const beforeCount = cells.filter(cell => cell.completedBefore).length;
  const text = CELL_TEXT[board.size];

  const boardCells = cells.map(cell => ({
    id: `${cell.index}`,
    completed: cell.achievedInSession || cell.completedBefore,
    color: cell.achievedInSession ? colors.primary : colors.muted,
    icon: (
      <View style={styles.cellContent}>
        {cell.achievedInSession ? (
          <Ionicons name="checkmark" size={text.check} color={colors.ink} />
        ) : null}
        <AppText
          style={[styles.cellTitle, { fontSize: text.font }]}
          numberOfLines={text.lines}
          ellipsizeMode="tail"
        >
          {cell.missionTitle}
        </AppText>
      </View>
    ),
  }));

  return (
    <Card>
      <AppText style={styles.heading}>
        {`${title} ${achievedCount}/${cells.length}`}
      </AppText>

      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendSwatch, styles.sessionSwatch]} />
          <AppText style={styles.legendLabel}>이번 산책</AppText>
          <AppText style={styles.legendCount}>{`${achievedCount}칸`}</AppText>
        </View>

        {beforeCount > 0 ? (
          <View style={styles.legendRow}>
            <View style={[styles.legendSwatch, styles.beforeSwatch]} />
            <AppText style={styles.legendLabel}>지난 산책</AppText>
            <AppText style={styles.legendCount}>{`${beforeCount}칸`}</AppText>
          </View>
        ) : null}

        <View style={styles.legendRow}>
          <View style={[styles.legendSwatch, styles.emptySwatch]} />
          <AppText style={styles.legendLabel}>못 깬 칸</AppText>
          <AppText style={styles.legendCount}>
            {`${cells.length - achievedCount - beforeCount}칸`}
          </AppText>
        </View>
      </View>

      <View style={styles.board}>
        <BingoBoard size={board.size} cells={boardCells} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: bodyFont.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  cellTitle: {
    fontFamily: bodyFont.regular,
    color: colors.ink,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    // 좁은 화면에서 잘리지 않게 다음 줄로 넘긴다.
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendSwatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  sessionSwatch: {
    backgroundColor: colors.primary,
  },
  beforeSwatch: {
    backgroundColor: colors.muted,
  },
  emptySwatch: {
    backgroundColor: colors.neutralBg,
  },
  legendLabel: {
    flexShrink: 1,
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.7,
  },
  legendCount: {
    fontFamily: bodyFont.bold,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
  },
  board: {
    marginTop: spacing.md,
  },
});
