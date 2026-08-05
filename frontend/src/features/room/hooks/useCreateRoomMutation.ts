import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createRoom, type CreateRoomRequest } from '../api/roomApi';

export function useCreateRoomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateRoomRequest) => createRoom(body),
    onSuccess: () => {
      // 목록은 mode마다 캐시 키가 따로다(['rooms','mine','COOPERATE'] 등). 방을
      // 만든 화면만 다시 불러오면 나머지 키는 만들기 전 목록을 그대로 들고 있어서,
      // 방금 만든 방이 그 화면에서만 안 보인다. 삭제·나가기와 같이 통째로 턴다.
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}
