import { useQuery } from '@tanstack/react-query';

import { getMyAvatar } from '../api/memberApi';
import { toCharacter } from '../model/character';

const STALE_TIME_MS = 60 * 1000;

export const CHARACTER_QUERY_KEY = ['member', 'character'];

export function useMyCharacterQuery() {
  return useQuery({
    queryKey: CHARACTER_QUERY_KEY,
    queryFn: async () => toCharacter(await getMyAvatar()),
    staleTime: STALE_TIME_MS,
  });
}
