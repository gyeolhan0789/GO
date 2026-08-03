import { useQuery } from '@tanstack/react-query';

import { getReceivedRoomInvites } from '../api/roomApi';

export function useReceivedRoomInvitesQuery() {
  return useQuery({
    queryKey: ['room-invites', 'received'],
    queryFn: () => getReceivedRoomInvites(),
  });
}
