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
      // 수락한 순간 내 산책방이 하나 늘었다. 목록 캐시를 그대로 두면 홈의
      // 같이하기 시트가 앱을 다시 열 때까지 새 방을 모른다.
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}
