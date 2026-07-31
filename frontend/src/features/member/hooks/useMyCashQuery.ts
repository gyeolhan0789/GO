import { useQuery } from '@tanstack/react-query';

import { getMyCash } from '../api/memberApi';

// 포인트는 미션 완료·상점 구매 등으로 자주 안 바뀌니, 재진입할 때마다 다시
// 부르지 않도록 잠깐 캐시를 유지한다.
const STALE_TIME_MS = 60 * 1000;

export const CASH_QUERY_KEY = ['member', 'cash'];

export function useMyCashQuery() {
  return useQuery({
    queryKey: CASH_QUERY_KEY,
    queryFn: () => getMyCash(),
    staleTime: STALE_TIME_MS,
  });
}
