import { useQuery } from '@tanstack/react-query';

import { getMyCash } from '../api/memberApi';

// 포인트는 미션 완료·상점 구매 등으로 자주 안 바뀌니, 재진입할 때마다 다시
// 부르지 않도록 잠깐 캐시를 유지한다.
const STALE_TIME_MS = 60 * 1000;

export const CASH_QUERY_KEY = ['member', 'cash'];

// TODO: 상점 구매 mutation이 생기면, 성공 콜백에서
// queryClient.invalidateQueries({ queryKey: CASH_QUERY_KEY })로 이 캐시를
// 즉시 무효화한다. staleTime만으로는 구매 직후에도 옛 포인트가 보일 수 있다.
export function useMyCashQuery() {
  return useQuery({
    queryKey: CASH_QUERY_KEY,
    queryFn: () => getMyCash(),
    staleTime: STALE_TIME_MS,
  });
}
