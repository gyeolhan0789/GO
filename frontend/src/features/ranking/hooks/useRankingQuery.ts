import { useQuery } from '@tanstack/react-query';

import {
  getFriendRankings,
  getRegionRankings,
  type RankingScope,
} from '../api/rankingApi';

// 걸음 집계는 자주 바뀌지 않는다. 탭을 오갈 때마다 다시 부르지 않도록 잠깐 캐시한다.
const STALE_TIME_MS = 60 * 1000;
const PAGE_SIZE = 20;

export const RANKING_QUERY_KEY = ['rankings'];

export function useRankingQuery(scope: RankingScope) {
  return useQuery({
    queryKey: [...RANKING_QUERY_KEY, scope],
    queryFn: () =>
      scope === 'friend'
        ? getFriendRankings({ size: PAGE_SIZE })
        : getRegionRankings({ size: PAGE_SIZE }),
    staleTime: STALE_TIME_MS,
  });
}
