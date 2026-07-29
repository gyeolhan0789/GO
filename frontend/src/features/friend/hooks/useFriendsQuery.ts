import { useQuery } from '@tanstack/react-query';

import { getFriends } from '../api/friendApi';

export function useFriendsQuery() {
  return useQuery({
    queryKey: ['friends'],
    queryFn: () => getFriends(),
  });
}
