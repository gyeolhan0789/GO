import { useQuery } from '@tanstack/react-query';

import { getMyRooms, type GameMode } from '../api/roomApi';

export function useMyRoomsQuery(mode?: GameMode) {
  return useQuery({
    queryKey: ['rooms', 'mine', mode ?? 'all'],
    queryFn: () => getMyRooms(mode),
  });
}
