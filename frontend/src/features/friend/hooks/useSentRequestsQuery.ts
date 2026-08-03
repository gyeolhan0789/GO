import { useInfiniteQuery } from '@tanstack/react-query';

import { getSentRequests } from '../api/friendApi';

/** 한 번에 받아오는 요청 수. */
export const SENT_REQUEST_PAGE_SIZE = 20;

/** 내가 보낸 친구 요청 전체. 서버는 최신순 한 가지로만 준다. */
export function useSentRequestsQuery() {
  return useInfiniteQuery({
    queryKey: ['friend-requests', 'sent'],
    queryFn: ({ pageParam }) =>
      getSentRequests({ page: pageParam, size: SENT_REQUEST_PAGE_SIZE }),
    initialPageParam: 0,
    // 전체 개수를 모르니 페이지 번호를 직전 값에서 하나씩 올린다.
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNext ? lastPageParam + 1 : undefined,
  });
}
