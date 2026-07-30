import { useMutation, useQueryClient } from '@tanstack/react-query';

import { acceptRoomInvite } from '../api/roomApi';

export function useAcceptRoomInviteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roomId,
      requestId,
    }: {
      roomId: number;
      requestId: number;
    }) => acceptRoomInvite(roomId, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['room-invites', 'received'],
      });
    },
  });
}
