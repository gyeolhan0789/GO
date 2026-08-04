import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteRoom } from '../api/roomApi';

export function useDeleteRoomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: number) => deleteRoom(roomId),
    onSuccess: () => {
      // 내 산책방 목록(['rooms','mine',...])과 방 상세(['rooms', roomId])를
      // 한 번에 갈아치운다.
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      // 산책 기록은 방이 아니라 나에게 달려 있어서, 방을 지워도 그대로 남는다.
    },
  });
}
