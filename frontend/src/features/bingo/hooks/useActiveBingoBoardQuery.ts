import { useQuery } from '@tanstack/react-query';

import { getActiveBingoBoard } from '../api/bingoApi';

export function useActiveBingoBoardQuery(roomId: number | null) {
  return useQuery({
    queryKey: ['bingoBoards', 'active', roomId],
    queryFn: () => getActiveBingoBoard(roomId as number),
    enabled: roomId !== null,
  });
}
