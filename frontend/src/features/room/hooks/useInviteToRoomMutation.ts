import { useMutation } from '@tanstack/react-query';

import { inviteToRoom } from '../api/roomApi';

export function useInviteToRoomMutation() {
  return useMutation({
    mutationFn: ({
      roomId,
      inviteeId,
    }: {
      roomId: number;
      inviteeId: number;
    }) => inviteToRoom(roomId, inviteeId),
  });
}
