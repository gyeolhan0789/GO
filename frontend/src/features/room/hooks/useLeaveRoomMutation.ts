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
      // 방을 나가면 서버가 진행 중이던 판을 닫으면서 산책 기록을 만든다.
      queryClient.invalidateQueries({ queryKey: ['game-results'] });
    },
  });
}
