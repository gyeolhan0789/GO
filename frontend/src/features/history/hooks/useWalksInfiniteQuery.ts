import { useInfiniteQuery } from '@tanstack/react-query';

import { buildMockWalkPage } from '../mocks';
import type { WalkDateRange, WalkFilter, WalkSort } from '../types';

/** 한 번에 받아오는 산책 수. */
export const WALK_PAGE_SIZE = 10;

/**
 * 조건이 queryKey에 들어가 있어서, 바꾸면 쌓아둔 페이지를 버리고 첫 페이지부터
 * 다시 받는다. 조건이 바뀌면 페이지 번호의 의미가 달라지기 때문이다.
 *
 * TODO: 산책 단위 기록 API가 아직 없다(../types.ts의 RecentWalk 참고).
 */
export function useWalksInfiniteQuery(
  filter: WalkFilter,
  sort: WalkSort,
  dateRange: WalkDateRange | null,
) {
  return useInfiniteQuery({
    queryKey: ['walks', filter, sort, dateRange],
    queryFn: async ({ pageParam }) =>
      buildMockWalkPage(pageParam, WALK_PAGE_SIZE, filter, sort, dateRange),
    initialPageParam: 0,
    // 전체 개수를 모르니 페이지 번호를 직전 값에서 하나씩 올린다.
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNext ? lastPageParam + 1 : undefined,
  });
}
