/**
 * @format
 */

import { percent } from '../src/shared/lib/percent';

describe('percent', () => {
  test('부동소수점 꼬리를 잘라낸다', () => {
    // 실제로 타입 오류를 냈던 값. (0.5 - 0.508) * 100 = -0.8000000000000007
    expect(percent((0.5 - 0.508) * 100)).toBe('-0.8%');
    // ItemThumbnail의 카테고리별 세로 보정값들.
    expect(percent((0.5 - 1.5 * 0.5175) * 100)).toBe('-27.625%');
    expect(percent((0.5 - 1.5 * 0.28) * 100)).toBe('8%');
    expect(percent((0.5 - 1.5 * 0.32) * 100)).toBe('2%');
    expect(percent((0.5 - 1.5 * 0.47) * 100)).toBe('-20.5%');
    expect(percent((0.5 - 1.5 * 0.76) * 100)).toBe('-64%');
  });

  test('꼬리가 없는 값은 그대로 둔다', () => {
    expect(percent(0)).toBe('0%');
    expect(percent(100)).toBe('100%');
    expect(percent(150)).toBe('150%');
    expect(percent(-46)).toBe('-46%');
  });

  test('소수 3자리까지 유지한다', () => {
    expect(percent(14.2857142857)).toBe('14.286%');
    expect(percent(0.0004)).toBe('0%');
  });

  test('NaN·Infinity는 0%로 떨어뜨린다', () => {
    // 0으로 나눈 값이 스타일에 그대로 들어가면 "NaN%"가 되어 레이아웃이 깨진다.
    expect(percent(NaN)).toBe('0%');
    expect(percent(0 / 0)).toBe('0%');
    expect(percent(Infinity)).toBe('0%');
    expect(percent(-Infinity)).toBe('0%');
  });
});
