import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getFriends } from '../api/friendApi';

type UseFriendsQueryOptions = {
  enabled?: boolean;
};

export function useFriendsQuery(options: UseFriendsQueryOptions = {}) {
  return useQuery({
    queryKey: ['friends'],
    queryFn: () => getFriends(),
    enabled: options.enabled ?? true,
  });
}

/** 한 번에 받아오는 친구 수. */
export const FRIENDS_PAGE_SIZE = 20;

/** 동행 탭 내 친구 목록처럼 스크롤해서 계속 불러와야 하는 화면에서 쓴다. */
export function useInfiniteFriendsQuery() {
  return useInfiniteQuery({
    queryKey: ['friends', 'infinite'],
    queryFn: ({ pageParam }) =>
      getFriends({ page: pageParam, size: FRIENDS_PAGE_SIZE }),
    initialPageParam: 0,
    // 전체 개수를 모르니 페이지 번호를 직전 값에서 하나씩 올린다.
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNext ? lastPageParam + 1 : undefined,
  });
}
