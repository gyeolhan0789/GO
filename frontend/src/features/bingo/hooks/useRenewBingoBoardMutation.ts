import { useMutation, useQueryClient } from '@tanstack/react-query';

import { renewBingoBoard, type RenewBingoBoardRequest } from '../api/bingoApi';

export function useRenewBingoBoardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roomId,
      ...body
    }: RenewBingoBoardRequest & { roomId: number }) =>
      renewBingoBoard(roomId, body),
    onSuccess: () => {
      // 혼자·함께 방의 산책 기록은 이 갱신이 직전 판을 닫으면서 생긴다.
      // 여기서 비워주지 않으면 방금 끝낸 판이 기록 화면에 안 나타난다.
      queryClient.invalidateQueries({ queryKey: ['game-results'] });
    },
  });
}
