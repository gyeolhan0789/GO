import { useInfiniteQuery } from '@tanstack/react-query';

import { getNotifications } from '../api/notificationApi';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;
export const NOTIFICATIONS_PAGE_SIZE = 20;

export function useNotificationsQuery() {
  return useInfiniteQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: ({ pageParam }) =>
      getNotifications({ page: pageParam, size: NOTIFICATIONS_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNext ? lastPageParam + 1 : undefined,
  });
}
