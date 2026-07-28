import { useMutation, useQueryClient } from '@tanstack/react-query';

import { acceptFriendRequest } from '../api/friendApi';

export function useAcceptFriendRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) => acceptFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['friend-requests', 'received'],
      });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}
