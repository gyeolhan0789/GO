import { useQuery } from '@tanstack/react-query';

import { getWalkSession } from '../../walk-session/api/walkSessionApi';
import { toWalkDetail } from '../model/walkSession';

/**
 * 산책 상세. 내 산책만 조회되고 칸도 '이번 산책에 깼는지'로 갈리므로, 예전처럼
 * 내 memberId를 먼저 받아와 내 것을 가려낼 필요가 없다.
 */
export function useWalkDetailQuery(walkSessionId: number) {
  return useQuery({
    queryKey: ['walk-sessions', 'detail', walkSessionId],
    queryFn: async () => toWalkDetail(await getWalkSession(walkSessionId)),
  });
}
