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
    // 잠실 부근 → 서울
    expect(resolveRegionByCoords(37.5133, 127.1)).toBe('SEOUL');
    // 제주 서귀포 부근 → 제주
    expect(resolveRegionByCoords(33.2541, 126.56)).toBe('JEJU');
  });

  it('서울을 둘러싼 경기 도시를 서울로 잡지 않는다', () => {
    // 고양 킨텍스
    expect(resolveRegionByCoords(37.669, 126.746)).toBe('GYEONGGI');
    // 부천 상동
    expect(resolveRegionByCoords(37.504, 126.753)).toBe('GYEONGGI');
    // 성남 판교역
    expect(resolveRegionByCoords(37.3948, 127.1112)).toBe('GYEONGGI');
    // 수원 광교
    expect(resolveRegionByCoords(37.2996, 127.045)).toBe('GYEONGGI');
    // 의정부역
    expect(resolveRegionByCoords(37.7383, 127.0458)).toBe('GYEONGGI');
  });

  it('인천 본토와 강화를 경기로 넘기지 않는다', () => {
    // 인천 계양
    expect(resolveRegionByCoords(37.537, 126.737)).toBe('INCHEON');
    // 강화 초지대교 부근
    expect(resolveRegionByCoords(37.69, 126.52)).toBe('INCHEON');
  });

  it('광역시에 맞닿은 도(道) 도시도 제 시·도로 잡는다', () => {
    // 경산 영남대 → 경북(대구 아님)
    expect(resolveRegionByCoords(35.832, 128.757)).toBe('GYEONGBUK');
    // 김해 장유 → 경남(부산 아님)
    expect(resolveRegionByCoords(35.194, 128.806)).toBe('GYEONGNAM');
    // 화순읍 → 전남(광주 아님)
    expect(resolveRegionByCoords(35.0645, 126.9866)).toBe('JEONNAM');
  });

  it('붙어 있는 세종과 대전을 구분한다', () => {
    // 세종 보람동 부근
    expect(resolveRegionByCoords(36.487, 127.26)).toBe('SEJONG');
    // 대전 유성
    expect(resolveRegionByCoords(36.362, 127.356)).toBe('DAEJEON');
  });
});
