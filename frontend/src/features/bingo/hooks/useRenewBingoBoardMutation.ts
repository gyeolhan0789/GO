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
    onSuccess: (_data, { roomId }) => {
      // 갱신된 목표 걸음수·빙고 크기가 방 목록(솔로/협동 공통)과 그 방의
      // 활성 빙고판 조회에 바로 반영되도록 캐시를 무효화한다. 호출부(솔로
      // 갱신 시트 등)에서 개별적으로 refetch하던 것을 여기서 대신하므로
      // 앞으로 호출부를 새로 추가해도 빠뜨릴 걱정이 없다.
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['bingoBoards', 'active', roomId] });
    },
  });
}
