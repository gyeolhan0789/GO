/**
 * @format
 */

import { resolveMenuLeft } from '../src/shared/components/Select/resolveMenuLeft';

// 실제 화면에서 쓰는 값. 인원 필터는 화면 왼쪽, 정렬은 오른쪽에 놓인다.
const SCREEN_WIDTH = 412;
const SCREEN_MARGIN = 16;

describe('resolveMenuLeft', () => {
  test('오른쪽에 놓인 트리거는 오른쪽 끝에 맞춘다', () => {
    // 정렬 버튼: x 292, 너비 104 -> 오른쪽 끝 396. 메뉴 폭 124면 272에서 시작.
    expect(
      resolveMenuLeft({
        triggerX: 292,
        triggerWidth: 104,
        menuWidth: 124,
        screenWidth: SCREEN_WIDTH,
      }),
    ).toBe(272);
  });

  test('왼쪽에 놓인 트리거에서 메뉴가 화면 밖으로 나가지 않는다', () => {
    // 인원 필터: x 16, 너비 92. 오른쪽 정렬하면 16 + 92 - 132 = -24로 화면을 벗어난다.
    const left = resolveMenuLeft({
      triggerX: 16,
      triggerWidth: 92,
      menuWidth: 132,
      screenWidth: SCREEN_WIDTH,
    });

    expect(left).toBe(SCREEN_MARGIN);
    expect(left).toBeGreaterThanOrEqual(0);
  });

  test('메뉴 오른쪽도 화면을 넘지 않는다', () => {
    const menuWidth = 132;
    const left = resolveMenuLeft({
      triggerX: SCREEN_WIDTH - 40,
      triggerWidth: 40,
      menuWidth,
      screenWidth: SCREEN_WIDTH,
    });

    expect(left + menuWidth).toBeLessThanOrEqual(SCREEN_WIDTH);
  });

  test('메뉴가 화면보다 넓으면 왼쪽에 붙인다', () => {
    expect(
      resolveMenuLeft({
        triggerX: 16,
        triggerWidth: 92,
        menuWidth: 600,
        screenWidth: SCREEN_WIDTH,
      }),
    ).toBe(SCREEN_MARGIN);
  });

  test('어느 위치에 있어도 메뉴가 화면 안에 머문다', () => {
    const menuWidth = 132;

    for (let triggerX = 0; triggerX <= SCREEN_WIDTH - 92; triggerX += 4) {
      const left = resolveMenuLeft({
        triggerX,
        triggerWidth: 92,
        menuWidth,
        screenWidth: SCREEN_WIDTH,
      });

      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + menuWidth).toBeLessThanOrEqual(SCREEN_WIDTH);
    }
  });
});
