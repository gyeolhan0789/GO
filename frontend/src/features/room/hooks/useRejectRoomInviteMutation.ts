import { useMutation, useQueryClient } from '@tanstack/react-query';

import { rejectRoomInvite } from '../api/roomApi';

export function useRejectRoomInviteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roomId,
      requestId,
    }: {
      roomId: number;
      requestId: number;
    }) => rejectRoomInvite(roomId, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['room-invites', 'received'],
      });
    },
  });
}
