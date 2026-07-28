import { useMutation, useQueryClient } from '@tanstack/react-query';

import { rejectFriendRequest } from '../api/friendApi';

export function useRejectFriendRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) => rejectFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['friend-requests', 'received'],
      });
    },
  });
}
