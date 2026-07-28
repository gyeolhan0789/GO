import { useQuery } from '@tanstack/react-query';

import { searchMembers } from '../api/friendApi';

export function useMemberSearchQuery(keyword: string) {
  const trimmed = keyword.trim();

  return useQuery({
    queryKey: ['members', 'search', trimmed],
    queryFn: () => searchMembers({ keyword: trimmed }),
    enabled: trimmed.length > 0,
  });
}
