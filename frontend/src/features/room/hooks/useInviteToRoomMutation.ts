import { useMutation, useQueryClient } from '@tanstack/react-query';

import { inviteToRoom } from '../api/roomApi';

export function useInviteToRoomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roomId,
      inviteeId,
    }: {
      roomId: number;
      inviteeId: number;
    }) => inviteToRoom(roomId, inviteeId),
    onSuccess: () => {
      // 방금 보낸 초대가 방 상세의 '초대 대기' 목록에 바로 뜨도록 무효화한다.
      // 서버가 내가 보낸 초대 전체를 한 번에 주므로 방별로 나눌 키가 없다.
      queryClient.invalidateQueries({ queryKey: ['room-invites', 'sent'] });
    },
  });
}
