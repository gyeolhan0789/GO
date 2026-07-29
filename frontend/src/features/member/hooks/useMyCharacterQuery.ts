import { useQuery } from '@tanstack/react-query';

import { getMyCharacter } from '../api/memberApi';

const STALE_TIME_MS = 60 * 1000;

export function useMyCharacterQuery() {
  return useQuery({
    queryKey: ['member', 'character'],
    queryFn: () => getMyCharacter(),
    staleTime: STALE_TIME_MS,
  });
}
