import { useQuery } from '@tanstack/react-query';

import {
  getFriendRankings,
  getRegionRankings,
  type RankingScope,
} from '../api/rankingApi';

// 걸음 집계는 자주 바뀌지 않는다. 탭을 오갈 때마다 다시 부르지 않도록 잠깐 캐시한다.
const STALE_TIME_MS = 60 * 1000;

/**
 * 화면에 세우는 순위 수. 20위까지만 보여주고 그 뒤는 받지 않는다.
 *
 * 내 순위가 이 밖이면 목록에 안 나오므로, 화면 아래 고정 줄로 따로 알려준다.
 */
export const RANKING_LIMIT = 20;

export const RANKING_QUERY_KEY = ['rankings'];

export function useRankingQuery(scope: RankingScope) {
  return useQuery({
    queryKey: [...RANKING_QUERY_KEY, scope],
    queryFn: () =>
      scope === 'friend'
        ? getFriendRankings({ size: RANKING_LIMIT })
        : getRegionRankings({ size: RANKING_LIMIT }),
    staleTime: STALE_TIME_MS,
  });
}
