import { useQuery } from '@tanstack/react-query';

import { getRoomDetail } from '../api/roomApi';

export function useRoomDetailQuery(roomId: number | null) {
  return useQuery({
    queryKey: ['rooms', roomId],
    queryFn: () => getRoomDetail(roomId as number),
    enabled: roomId !== null,
  });
}
