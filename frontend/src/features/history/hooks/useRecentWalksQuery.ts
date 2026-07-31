import { useQuery } from '@tanstack/react-query';

import { getMyGameResults } from '../api/gameResultApi';
import { toWalkRecord } from '../model/gameResult';

/** '최근 산책'에 세울 개수. */
export const RECENT_WALK_LIMIT = 3;

async function fetchRecentWalks(limit: number) {
  const slice = await getMyGameResults({ page: 0, size: limit });

  return slice.content.map(toWalkRecord);
}

/** 서버가 최신순으로 내려주므로 첫 페이지를 그대로 쓴다. */
export function useRecentWalksQuery(limit: number = RECENT_WALK_LIMIT) {
  return useQuery({
    queryKey: ['game-results', 'recent', limit],
    queryFn: () => fetchRecentWalks(limit),
  });
}
