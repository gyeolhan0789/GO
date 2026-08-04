import type { WalkBingoCell } from '../types';

/** '빙고판 2/9'의 앞 숫자. 지난 산책에서 깬 칸은 이번 몫이 아니라 빼고 센다. */
export function countAchievedCells(cells: WalkBingoCell[]): number {
  return cells.filter(cell => cell.achievedInSession).length;
}
