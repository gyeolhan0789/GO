import { useMutation, useQueryClient } from '@tanstack/react-query';

import { sendFriendRequest } from '../api/friendApi';

export function useSendFriendRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteeId: number) => sendFriendRequest(inviteeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', 'search'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests', 'sent'] });
    },
  });
}
