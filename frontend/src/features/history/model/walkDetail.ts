import type { WalkBingoCell, WalkDetailParticipant } from '../types';

/** 사람마다 색을 주지 않고 '내 몫'과 '그 외'로만 가른다. */
export type BingoCellOwner = 'mine' | 'other' | 'none';

export function resolveBingoCellOwner(
  cell: WalkBingoCell,
  myMemberId: number,
): BingoCellOwner {
  if (cell.completedBy === null) {
    return 'none';
  }
  return cell.completedBy === myMemberId ? 'mine' : 'other';
}

/** '진행한 빙고판 6/9'의 앞 숫자. */
export function countCompletedCells(cells: WalkBingoCell[]): number {
  return cells.filter(cell => cell.completedBy !== null).length;
}

/** 누가 몇 칸을 깼는지. 빙고판 위 범례가 이 숫자를 그대로 보여준다. */
export function countCellsByOwner(
  cells: WalkBingoCell[],
  myMemberId: number,
): Record<BingoCellOwner, number> {
  return cells.reduce(
    (counts, cell) => {
      const owner = resolveBingoCellOwner(cell, myMemberId);
      return { ...counts, [owner]: counts[owner] + 1 };
    },
    { mine: 0, other: 0, none: 0 },
  );
}

/** 본인이 목록에 없으면(관전 등) 첫 참가자로 떨어진다. */
export function resolveMyParticipant(
  participants: WalkDetailParticipant[],
): WalkDetailParticipant | null {
  return (
    participants.find(participant => participant.isMe) ?? participants[0] ?? null
  );
}
