import { useMutation } from '@tanstack/react-query';

import { renewBingoBoard, type RenewBingoBoardRequest } from '../api/bingoApi';

// 산책 기록은 산책을 끝낼 때만 생기므로 판을 갈아도 기록은 그대로다 —
// 여기서 비워줄 캐시가 없다.
export function useRenewBingoBoardMutation() {
  return useMutation({
    mutationFn: ({
      roomId,
      ...body
    }: RenewBingoBoardRequest & { roomId: number }) =>
      renewBingoBoard(roomId, body),
  });
}
