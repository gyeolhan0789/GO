import { useQuery } from '@tanstack/react-query';

import { getFriends } from '../api/friendApi';

type UseFriendsQueryOptions = {
  enabled?: boolean;
};

export function useFriendsQuery(options: UseFriendsQueryOptions = {}) {
  return useQuery({
    queryKey: ['friends'],
    queryFn: () => getFriends(),
    enabled: options.enabled ?? true,
  });
}
