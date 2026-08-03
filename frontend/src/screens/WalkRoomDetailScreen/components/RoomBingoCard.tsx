import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import type { BingoBoardResponse } from '../../../features/bingo/api/bingoApi';
import { BingoBoard } from '../../../features/bingo/components/BingoBoard/BingoBoard';
import type { BingoBoardSize } from '../../../features/bingo/components/BingoBoard/BingoBoard';
import type { RoomMemberResponse } from '../../../features/room/api/roomApi';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';
import { getParticipantColor } from '../../../shared/lib/participantColor';

type RoomBingoCardProps = {
  board: BingoBoardResponse;
  members: RoomMemberResponse[];
  myMemberId: number | null;
  /** 빙고판 화면(미션 인증)으로 넘어가는 진입점. */
  onPress: () => void;
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

function isBoardSize(value: number): value is BingoBoardSize {
  return value === 3 || value === 4 || value === 5;
}

/** 진행 중인 빙고판 미리보기. 누르면 미션 인증 화면으로 들어간다. */
export function RoomBingoCard({
  board,
  members,
  myMemberId,
  onPress,
}: RoomBingoCardProps) {
  if (!isBoardSize(board.boardSize)) {
    return null;
  }
  const size = board.boardSize;

  // 빙고판·걸음 진행바가 공유하는 규칙("나"는 항상 에메랄드)을 그대로 따른다.
  const colorByMember = new Map(
    members.map(member => [
      member.memberId,
      getParticipantColor(member.memberId, myMemberId, members),
    ]),
  );

  const approvedCountByMember = new Map<number, number>();
  for (const cell of board.cells) {
    if (
      cell.verificationStatus === 'APPROVED' &&
      cell.submittedByMemberId !== null
    ) {
      approvedCountByMember.set(
        cell.submittedByMemberId,
        (approvedCountByMember.get(cell.submittedByMemberId) ?? 0) + 1,
      );
    }
  }

  const text = CELL_TEXT[size];

  // 서버 정렬을 믿지 않고 좌상단부터 행 우선으로 놓는다.
  const orderedCells = [...board.cells].sort(
    (a, b) => a.row - b.row || a.col - b.col,
  );

  const boardCells = orderedCells.map(cell => {
    const approved = cell.verificationStatus === 'APPROVED';
    const completedBy = approved ? cell.submittedByMemberId : null;

    return {
      id: `${cell.cellId}`,
      completed: approved,
      color: completedBy === null ? undefined : colorByMember.get(completedBy),
      icon: (
        <View style={styles.cellContent}>
          {approved ? (
            <Ionicons name="checkmark" size={text.check} color={colors.ink} />
          ) : null}
          <AppText
            style={[styles.cellTitle, { fontSize: text.font }]}
            numberOfLines={text.lines}
            ellipsizeMode="tail"
          >
            {cell.mission.title}
          </AppText>
        </View>
      ),
    };
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="빙고판 자세히 보기"
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card>
        <View style={styles.headingRow}>
          <AppText style={styles.heading}>
            {`빙고판 ${board.approvedCellCount}/${board.totalCellCount}`}
          </AppText>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </View>

        <View style={styles.legend}>
          {members.map(member => (
            <View key={member.memberId} style={styles.legendRow}>
              <View
                style={[
                  styles.legendSwatch,
                  { backgroundColor: colorByMember.get(member.memberId) },
                ]}
              />
              <AppText style={styles.legendLabel} numberOfLines={1}>
                {member.memberId === myMemberId ? '나' : member.nickname}
              </AppText>
              <AppText style={styles.legendCount}>
                {`${approvedCountByMember.get(member.memberId) ?? 0}칸`}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.board}>
          <BingoBoard size={size} cells={boardCells} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
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
