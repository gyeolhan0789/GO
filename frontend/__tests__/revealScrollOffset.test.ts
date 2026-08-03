/**
 * @format
 */

import { resolveRevealOffset } from '../src/shared/lib/revealScrollOffset';

/** 창 위 끝에서 시작해 400dp 지점부터 키보드에 덮이는 폼. 입력창은 48dp. */
const BASE = {
  offsetY: 100,
  visibleTop: 0,
  visibleBottom: 400,
  fieldHeight: 48,
  margin: 32,
};

describe('resolveRevealOffset', () => {
  test('여백까지 다 보이면 스크롤하지 않는다', () => {
    expect(resolveRevealOffset({ ...BASE, fieldTop: 200 })).toBeNull();
  });

  test('키보드에 가린 입력창은 여백만큼 더 끌어올린다', () => {
    // 아래 끝이 428, 여백을 더하면 460이라 400을 60만큼 넘는다.
    expect(resolveRevealOffset({ ...BASE, fieldTop: 380 })).toBe(160);
  });

  test('여백만 모자라도 그만큼 끌어올린다', () => {
    // 아래 끝 369는 보이지만 여백 32를 두면 1만큼 넘친다.
    expect(resolveRevealOffset({ ...BASE, fieldTop: 321 })).toBe(101);
  });

  test('위로 벗어난 입력창은 도로 내린다', () => {
    expect(resolveRevealOffset({ ...BASE, fieldTop: -10 })).toBe(58);
  });

  test('맨 위에서는 음수로 넘기지 않는다', () => {
    // 스크롤이 0인데 위쪽 여백이 모자라면 더 내릴 데가 없다.
    expect(resolveRevealOffset({ ...BASE, offsetY: 0, fieldTop: 10 })).toBe(0);
  });

  test('스크롤 뷰가 창 맨 위에서 시작하지 않아도 그만큼 빼고 잰다', () => {
    // 120부터 시작하는 스크롤 뷰. 입력창 위 끝 100은 그 위로 벗어나 있다.
    expect(resolveRevealOffset({ ...BASE, visibleTop: 120, fieldTop: 100 })).toBe(
      48,
    );
  });
});

/**
 * 화면·키보드 크기(dp). S25는 실기기에서 잰 값이고 나머지는 대표 크기다.
 * 계산이 특정 크기를 가정하지 않는지 확인한다.
 */
const DEVICES = [
  { name: '작은 폰 360x640', scrollBottom: 592, keyboardTop: 390 },
  { name: 'S25 384x832', scrollBottom: 784, keyboardTop: 505.6 },
  { name: '큰 폰 412x915', scrollBottom: 867, keyboardTop: 560 },
  { name: '태블릿 800x1280', scrollBottom: 1232, keyboardTop: 900 },
  // 키보드가 화면 절반을 먹는 가로 모드.
  { name: '가로 모드 832x384', scrollBottom: 360, keyboardTop: 200 },
];

const FIELD_HEIGHT = 46;
const MARGIN = 32;

describe('resolveRevealOffset 기기 크기', () => {
  test.each(DEVICES)(
    '$name — 가려진 입력창을 여백까지 딱 맞게 올린다',
    ({ scrollBottom, keyboardTop }) => {
      // 훅이 넘기는 값과 같은 방식으로 아래 경계를 잡는다.
      const visibleBottom = Math.min(scrollBottom, keyboardTop);
      // 키보드 바로 아래에 걸쳐 가려진 입력창.
      const fieldTop = keyboardTop + 20;
      const offsetY = 0;

      const next = resolveRevealOffset({
        offsetY,
        visibleTop: 0,
        visibleBottom,
        fieldTop,
        fieldHeight: FIELD_HEIGHT,
        margin: MARGIN,
      });

      if (next === null) {
        throw new Error('가려져 있는데 스크롤하지 않는다고 나왔다.');
      }

      // 스크롤한 만큼 입력창이 위로 올라온 자리.
      const movedTop = fieldTop - (next - offsetY);
      expect(movedTop + FIELD_HEIGHT + MARGIN).toBeCloseTo(visibleBottom);
      expect(movedTop).toBeGreaterThanOrEqual(0);
    },
  );
});
