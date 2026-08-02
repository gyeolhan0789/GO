import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cancelFriendRequest } from '../api/friendApi';

export function useCancelFriendRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) => cancelFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['friend-requests', 'sent'],
      });
      // 취소한 상대는 검색 결과에서 '요청됨'이 아니라 다시 '추가'로 보여야 한다.
      queryClient.invalidateQueries({ queryKey: ['members', 'search'] });
    },
  });
}
