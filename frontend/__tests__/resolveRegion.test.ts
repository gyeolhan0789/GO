import { resolveRegionByCoords } from '../src/features/auth/model/resolveRegion';

describe('resolveRegionByCoords', () => {
  it('시청 부근 좌표를 가까운 시·도로 변환한다', () => {
    expect(resolveRegionByCoords(37.5665, 126.978)).toBe('SEOUL');
    expect(resolveRegionByCoords(35.1796, 129.0756)).toBe('BUSAN');
    expect(resolveRegionByCoords(33.4996, 126.5312)).toBe('JEJU');
  });

  it('중심점에서 다소 벗어난 좌표도 최근접 시·도로 잡는다', () => {
    // 강남역 부근 → 서울
    expect(resolveRegionByCoords(37.4979, 127.0276)).toBe('SEOUL');
    // 제주 서귀포 부근 → 제주
    expect(resolveRegionByCoords(33.2541, 126.56)).toBe('JEJU');
  });
});
