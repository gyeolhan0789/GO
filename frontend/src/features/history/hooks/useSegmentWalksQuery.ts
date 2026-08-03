import { useQuery } from '@tanstack/react-query';

import { buildMockWalksInSegment } from '../mocks';
import type { ChartSegment } from '../model/chartSegments';

/**
 * 차트에서 고른 구간의 산책 목록. segment가 null이면 아직 고르지 않은 상태다.
 *
 * TODO: 산책 단위 기록 API가 아직 없다(../types.ts의 RecentWalk 참고).
 */
export function useSegmentWalksQuery(segment: ChartSegment | null) {
  return useQuery({
    // 같은 구간이면 다시 열어도 받아둔 목록을 쓴다.
    queryKey: ['segment-walks', segment?.dateRange, segment?.hourRange],
    queryFn: async () =>
      segment === null ? [] : buildMockWalksInSegment(segment),
    enabled: segment !== null,
  });
}
