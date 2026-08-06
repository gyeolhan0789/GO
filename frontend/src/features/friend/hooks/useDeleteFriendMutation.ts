import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteFriend } from '../api/friendApi';
import { RANKING_QUERY_KEY } from '../../ranking/hooks/useRankingQuery';

export function useDeleteFriendMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendId: number) => deleteFriend(friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      // 친구가 줄었으니 friend scope 랭킹(순위표에서 빠진다)도 같이 갱신한다.
      queryClient.invalidateQueries({ queryKey: RANKING_QUERY_KEY });
    },
  });
}
