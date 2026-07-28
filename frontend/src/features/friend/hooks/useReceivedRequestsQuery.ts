import { useQuery } from '@tanstack/react-query';

import { getReceivedRequests } from '../api/friendApi';

export function useReceivedRequestsQuery() {
  return useQuery({
    queryKey: ['friend-requests', 'received'],
    queryFn: () => getReceivedRequests(),
  });
}
