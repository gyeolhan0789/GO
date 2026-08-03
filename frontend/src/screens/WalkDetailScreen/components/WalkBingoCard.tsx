import { StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { BingoBoard } from '../../../features/bingo/components/BingoBoard/BingoBoard';
import type { BingoBoardSize } from '../../../features/bingo/components/BingoBoard/BingoBoard';
import {
  countCellsByMember,
  countCompletedCells,
} from '../../../features/history/model/walkDetail';
import type {
  WalkBingoCell,
  WalkDetailParticipant,
} from '../../../features/history/types';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { colors, participantColors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type WalkBingoCardProps = {
  size: BingoBoardSize;
  cells: WalkBingoCell[];
  /** 본인이 맨 앞. 이 순서대로 색을 나눠 갖는다. */
  participants: WalkDetailParticipant[];
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

export function WalkBingoCard({
  size,
  cells,
  participants,
}: WalkBingoCardProps) {
  const completedCount = countCompletedCells(cells);
  const countsByMember = countCellsByMember(cells);

  // 색은 참가자 순서로 나눠 준다. 협동은 최대 4명이라 팔레트가 모자라지 않는다.
  const colorByMember = new Map(
    participants.map((participant, index) => [
      participant.memberId,
      participantColors[index % participantColors.length],
    ]),
  );

  const text = CELL_TEXT[size];

  const boardCells = cells.map(cell => {
    const completedBy = cell.completedBy;

    return {
      id: `${cell.index}`,
      completed: completedBy !== null,
      color: completedBy === null ? undefined : colorByMember.get(completedBy),
      icon: (
        <View style={styles.cellContent}>
          {completedBy === null ? null : (
            <Ionicons name="checkmark" size={text.check} color={colors.ink} />
          )}
          <AppText
            style={[styles.cellTitle, { fontSize: text.font }]}
            numberOfLines={text.lines}
            ellipsizeMode="tail"
          >
            {cell.missionTitle}
          </AppText>
        </View>
      ),
    };
  });

  return (
    <Card>
      <AppText style={styles.heading}>
        {`진행한 빙고판 ${completedCount}/${cells.length}`}
      </AppText>

      {/* 누가 어느 칸을 깼는지가 이 화면의 핵심이라 범례를 늘 펼쳐 둔다. */}
      <View style={styles.legend}>
        {participants.map(participant => (
          <View key={participant.memberId} style={styles.legendRow}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: colorByMember.get(participant.memberId) },
              ]}
            />
            <AppText style={styles.legendLabel} numberOfLines={1}>
              {participant.isMe ? '나' : participant.nickname}
            </AppText>
            <AppText style={styles.legendCount}>
              {`${countsByMember.get(participant.memberId) ?? 0}칸`}
            </AppText>
          </View>
        ))}

        <View style={styles.legendRow}>
          <View style={[styles.legendSwatch, styles.emptySwatch]} />
          <AppText style={styles.legendLabel}>못 깬 칸</AppText>
          <AppText style={styles.legendCount}>
            {`${cells.length - completedCount}칸`}
          </AppText>
        </View>
      </View>

      <View style={styles.board}>
        <BingoBoard size={size} cells={boardCells} />
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
