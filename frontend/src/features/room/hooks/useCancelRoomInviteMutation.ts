import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cancelRoomInvite } from '../api/roomApi';

export function useCancelRoomInviteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roomId,
      requestId,
    }: {
      roomId: number;
      requestId: number;
    }) => cancelRoomInvite(roomId, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['room-invites', 'sent'],
      });
    },
  });
}
