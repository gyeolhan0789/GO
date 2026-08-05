import { useMutation } from '@tanstack/react-query';

import { renewBingoBoard, type RenewBingoBoardRequest } from '../api/bingoApi';

export function useRenewBingoBoardMutation() {
  return useMutation({
    mutationFn: ({
      roomId,
      ...body
    }: RenewBingoBoardRequest & { roomId: number }) =>
      renewBingoBoard(roomId, body),
  });
}
