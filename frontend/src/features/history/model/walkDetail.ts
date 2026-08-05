import type { WalkBingoCell } from '../types';

/**
 * 이번 산책에 깬 칸만, 깬 순서대로. 시각을 모르는 칸은 순서를 정할 수 없어
 * 뒤로 보낸다 — 판 위 자리(index)와 깬 순서는 서로 상관이 없다.
 */
export function selectAchievedCells(cells: WalkBingoCell[]): WalkBingoCell[] {
  // filter가 새 배열을 주므로 여기서 정렬해도 원본은 그대로다.
  return cells
    .filter(cell => cell.achievedInSession)
    .sort((left, right) => toSortableTime(left) - toSortableTime(right));
}

/** 시각을 못 읽는 칸은 뒤로 보낸다. 오프셋이 붙어 와도 되게 문자열이 아니라 Date로 잰다. */
function toSortableTime(cell: WalkBingoCell): number {
  if (cell.achievedAt === null) {
    return Number.POSITIVE_INFINITY;
  }
  const time = new Date(cell.achievedAt).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}
