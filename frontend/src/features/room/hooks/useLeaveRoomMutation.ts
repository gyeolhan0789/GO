import { useMutation, useQueryClient } from '@tanstack/react-query';

import { leaveRoom } from '../api/roomApi';

export function useLeaveRoomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: number) => leaveRoom(roomId),
    onSuccess: () => {
      // 내 산책방 목록(['rooms','mine',...])과 방 상세(['rooms', roomId])를
      // 한 번에 갈아치운다.
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}
