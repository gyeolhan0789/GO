import { useQuery } from '@tanstack/react-query';

import { getSentRoomInvites } from '../api/roomApi';

export function useSentRoomInvitesQuery(enabled = true) {
  return useQuery({
    queryKey: ['room-invites', 'sent'],
    queryFn: () => getSentRoomInvites(),
    enabled,
  });
}
