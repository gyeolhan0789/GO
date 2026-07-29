import { useQuery } from '@tanstack/react-query';

import { buildMockRecentWalks } from '../mocks';

/** '최근 산책'에 세울 개수. */
export const RECENT_WALK_LIMIT = 3;

/** TODO: 산책 단위 기록 API가 아직 없다(../types.ts의 RecentWalk 참고). */
export function useRecentWalksQuery(limit: number = RECENT_WALK_LIMIT) {
  return useQuery({
    queryKey: ['recent-walks', limit],
    queryFn: async () => buildMockRecentWalks(limit),
  });
}
