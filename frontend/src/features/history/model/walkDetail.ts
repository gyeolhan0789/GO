import type { WalkBingoCell } from '../types';

/** '진행한 빙고판 6/9'의 앞 숫자. */
export function countCompletedCells(cells: WalkBingoCell[]): number {
  return cells.filter(cell => cell.completedBy !== null).length;
}

/** memberId별로 몇 칸을 깼는지. 빙고판 범례가 이 숫자를 그대로 보여준다. */
export function countCellsByMember(
  cells: WalkBingoCell[],
): Map<number, number> {
  const counts = new Map<number, number>();

  cells.forEach(cell => {
    if (cell.completedBy !== null) {
      counts.set(cell.completedBy, (counts.get(cell.completedBy) ?? 0) + 1);
    }
  });

  return counts;
}
