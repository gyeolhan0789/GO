import { useQuery } from '@tanstack/react-query';

import { useMyCharacterQuery } from '../../member/hooks/useMyCharacterQuery';
import { getGameResult } from '../api/gameResultApi';
import { toWalkDetail } from '../model/gameResult';
import type { WalkDetail } from '../types';

type WalkDetailQueryResult = {
  walk: WalkDetail | null;
  isLoading: boolean;
  isError: boolean;
};

/**
 * 산책 상세. 응답에 '이 사람이 나'라는 표시가 없어서 내 memberId를 먼저 알아야
 * 내 빙고판과 내가 완료한 칸을 가려낼 수 있다.
 */
export function useWalkDetailQuery(roomId: number): WalkDetailQueryResult {
  const characterQuery = useMyCharacterQuery();
  const myMemberId = characterQuery.data?.memberId ?? null;

  const walkQuery = useQuery({
    queryKey: ['game-results', 'detail', roomId, myMemberId],
    queryFn: async () => {
      const response = await getGameResult(roomId);

      // enabled가 막아주지만 타입을 좁히려면 여기서 한 번 더 확인해야 한다.
      return myMemberId === null ? null : toWalkDetail(response, myMemberId);
    },
    enabled: myMemberId !== null,
  });

  return {
    walk: walkQuery.data ?? null,
    // 내 memberId를 받아오는 동안 산책 쿼리는 아직 시작도 못 한 상태다.
    isLoading: characterQuery.isLoading || walkQuery.isLoading,
    isError: characterQuery.isError || walkQuery.isError,
  };
}
