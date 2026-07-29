import { spacing } from '../../constants/spacing';

/** 화면 가장자리에 붙지 않게 남기는 최소 여백. */
const SCREEN_MARGIN = spacing.md;

type MenuPosition = {
  /** 트리거의 화면 기준 x. */
  triggerX: number;
  triggerWidth: number;
  menuWidth: number;
  screenWidth: number;
};

/**
 * 트리거 오른쪽 끝에 맞추되, 화면 왼쪽에 놓인 트리거는 그 계산이 음수가 되어
 * 메뉴가 화면 밖으로 나가므로 양쪽 가장자리 안으로 밀어 넣는다.
 */
export function resolveMenuLeft({
  triggerX,
  triggerWidth,
  menuWidth,
  screenWidth,
}: MenuPosition): number {
  const rightAligned = triggerX + triggerWidth - menuWidth;
  // 메뉴가 화면보다 넓으면 오른쪽 한계가 더 작아지므로 왼쪽에 붙인다.
  const maxLeft = Math.max(screenWidth - menuWidth - SCREEN_MARGIN, SCREEN_MARGIN);

  return Math.min(Math.max(rightAligned, SCREEN_MARGIN), maxLeft);
}
