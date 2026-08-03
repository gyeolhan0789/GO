import { useQuery } from '@tanstack/react-query';

import { getMyGameResults } from '../api/gameResultApi';
import type { ChartSegment } from '../model/chartSegments';
import {
  selectWalksInSegment,
  startsBeforeSegment,
} from '../model/chartSegments';
import { toWalkRecord } from '../model/gameResult';
import type { WalkRecord } from '../types';

/**
 * 한 번에 받아오는 산책 수. 최근 구간은 대개 첫 장에서 끝나므로 목록 화면보다
 * 크게 잡아 요청 수를 줄인다.
 */
export const SEGMENT_SCAN_PAGE_SIZE = 50;

/**
 * 서버는 기간 조건을 받지 않고 최신순 페이지만 준다(useWalksInfiniteQuery 참고).
 * 그래서 구간을 지나칠 때까지 위에서부터 훑는다. 최신순이라 구간 시작보다 이른
 * 산책이 나오면 그 뒤는 모두 구간 밖이므로 거기서 멈춘다.
 */
async function fetchSegmentWalks(segment: ChartSegment): Promise<WalkRecord[]> {
  const walks: WalkRecord[] = [];

  for (let page = 0; ; page += 1) {
    const slice = await getMyGameResults({
      page,
      size: SEGMENT_SCAN_PAGE_SIZE,
    });
    const records = slice.content.map(toWalkRecord);

    walks.push(...selectWalksInSegment(records, segment));

    const passedSegment = records.some(record =>
      startsBeforeSegment(record, segment),
    );
    if (passedSegment || !slice.hasNext) {
      return walks;
    }
  }
}

/** 차트에서 고른 구간의 산책. segment가 null이면 아직 고르지 않은 상태다. */
export function useSegmentWalksQuery(segment: ChartSegment | null) {
  return useQuery({
    // 같은 구간이면 다시 열어도 받아둔 목록을 쓴다.
    queryKey: [
      'game-results',
      'segment',
      segment?.dateRange,
      segment?.hourRange,
    ],
    queryFn: () =>
      segment === null ? Promise.resolve([]) : fetchSegmentWalks(segment),
    enabled: segment !== null,
  });
}
