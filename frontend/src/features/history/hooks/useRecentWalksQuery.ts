import { useQuery } from '@tanstack/react-query';

import { getWalkSessions } from '../../walk-session/api/walkSessionApi';
import { toWalkRecord } from '../model/walkSession';

/** '최근 산책'에 세울 개수. */
export const RECENT_WALK_LIMIT = 3;

async function fetchRecentWalks(limit: number) {
  const slice = await getWalkSessions({ page: 0, size: limit });

  return slice.content.map(toWalkRecord);
}

/** 서버가 최신순으로 내려주므로 첫 페이지를 그대로 쓴다. */
export function useRecentWalksQuery(limit: number = RECENT_WALK_LIMIT) {
  return useQuery({
    queryKey: ['walk-sessions', 'recent', limit],
    queryFn: () => fetchRecentWalks(limit),
  });
}
