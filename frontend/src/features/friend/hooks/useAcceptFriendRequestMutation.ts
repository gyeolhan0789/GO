import { useMutation, useQueryClient } from '@tanstack/react-query';

import { acceptFriendRequest } from '../api/friendApi';
import { RANKING_QUERY_KEY } from '../../ranking/hooks/useRankingQuery';

export function useAcceptFriendRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) => acceptFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['friend-requests', 'received'],
      });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      // 친구가 늘었으니 friend scope 랭킹(순위표에 새 친구가 들어온다)도
      // 같이 갱신한다.
      queryClient.invalidateQueries({ queryKey: RANKING_QUERY_KEY });
    },
  });
}
