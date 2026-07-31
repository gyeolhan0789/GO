import { useQuery } from '@tanstack/react-query';

import { getMyRooms } from '../api/roomApi';

export function useMyRoomsQuery() {
  return useQuery({
    queryKey: ['rooms', 'my'],
    queryFn: () => getMyRooms(),
  });
}
