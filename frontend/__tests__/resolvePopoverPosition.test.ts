/**
 * @format
 */

import {
  ANCHOR_GAP,
  resolvePopoverPosition,
} from '../src/screens/RecordScreen/components/resolvePopoverPosition';

const SCREEN_WIDTH = 400;
const SCREEN_HEIGHT = 800;
const POPOVER_WIDTH = 240;

/** 차트가 화면 중간에 있는 상태. 위로 올릴 자리가 넉넉하다. */
const CHART_TOP = 300;
const CHART_BOTTOM = 500;

function resolve(centerX: number, top = CHART_TOP, bottom = CHART_BOTTOM) {
  return resolvePopoverPosition({
    anchor: { centerX, top, bottom },
    popoverWidth: POPOVER_WIDTH,
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
  });
}

describe('resolvePopoverPosition', () => {
  test('막대를 가운데 두고 그 위에 놓는다', () => {
    const position = resolve(200);

    expect(position.isAbove).toBe(true);
    expect(position.left).toBe(200 - POPOVER_WIDTH / 2);
    // 카드 밑변이 차트 위 끝에서 틈만큼 떠 있어야 한다.
    expect(position.offset).toBe(SCREEN_HEIGHT - CHART_TOP + ANCHOR_GAP);
  });

  test('왼쪽 끝 막대에서도 카드가 화면 밖으로 나가지 않는다', () => {
    const position = resolve(40);

    expect(position.left).toBeGreaterThanOrEqual(0);
  });

  test('오른쪽 끝 막대에서도 카드가 화면 밖으로 나가지 않는다', () => {
    const position = resolve(380);

    expect(position.left + POPOVER_WIDTH).toBeLessThanOrEqual(SCREEN_WIDTH);
  });

  test('카드가 화면보다 넓으면 왼쪽 가장자리에 붙인다', () => {
    const position = resolvePopoverPosition({
      anchor: { centerX: 200, top: CHART_TOP, bottom: CHART_BOTTOM },
      // 좁은 화면에서 최대 폭을 줄이지 못한 경우.
      popoverWidth: SCREEN_WIDTH,
      screenWidth: SCREEN_WIDTH,
      screenHeight: SCREEN_HEIGHT,
    });

    // 오른쪽 한계가 왼쪽 여백보다 작아져도 음수로 새지 않아야 한다.
    expect(position.left).toBeGreaterThanOrEqual(0);
  });

  test('위에 자리가 없으면 막대 아래로 내린다', () => {
    // 차트가 화면 맨 위에 붙어 있어 카드를 올릴 자리가 없다.
    const position = resolve(200, 8, 208);

    expect(position.isAbove).toBe(false);
    // 아래로 내렸으면 offset은 화면 위에서 카드 윗변까지의 거리다.
    expect(position.offset).toBe(208 + ANCHOR_GAP);
  });
});
